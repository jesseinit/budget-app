#!/bin/bash
set -e

echo "Starting budget-app backend..."
echo "Pod: $HOSTNAME"

# Wait for database to be ready
echo "Waiting for database to be ready..."
MAX_DB_WAIT=60
DB_WAIT_COUNT=0
until PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; do
  DB_WAIT_COUNT=$((DB_WAIT_COUNT + 1))
  if [ $DB_WAIT_COUNT -ge $MAX_DB_WAIT ]; then
    echo "ERROR: Database not ready after ${MAX_DB_WAIT} attempts"
    exit 1
  fi
  echo "Postgres is unavailable - sleeping for 2 seconds (attempt $DB_WAIT_COUNT/$MAX_DB_WAIT)"
  sleep 2
done
echo "Postgres is up and ready!"

# Function to acquire PostgreSQL advisory lock
acquire_migration_lock() {
  # Use PostgreSQL advisory lock with a unique ID for migrations
  # Lock ID: 123456789 (arbitrary number for migration lock)
  local LOCK_ID=123456789
  local MAX_LOCK_WAIT=120  # Wait up to 2 minutes for lock
  local LOCK_WAIT_COUNT=0

  echo "Attempting to acquire migration lock..."

  while [ $LOCK_WAIT_COUNT -lt $MAX_LOCK_WAIT ]; do
    # Try to acquire the lock (non-blocking)
    LOCK_ACQUIRED=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT pg_try_advisory_lock($LOCK_ID);" | tr -d ' ')

    if [ "$LOCK_ACQUIRED" = "t" ]; then
      echo "✓ Migration lock acquired by pod: $HOSTNAME"
      return 0
    fi

    LOCK_WAIT_COUNT=$((LOCK_WAIT_COUNT + 1))
    echo "Migration lock held by another pod, waiting... (attempt $LOCK_WAIT_COUNT/$MAX_LOCK_WAIT)"
    sleep 1
  done

  echo "ERROR: Failed to acquire migration lock after ${MAX_LOCK_WAIT} seconds"
  echo "Another pod may be stuck running migrations. Check pod logs."
  exit 1
}

# Function to release PostgreSQL advisory lock
release_migration_lock() {
  local LOCK_ID=123456789
  echo "Releasing migration lock..."
  PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT pg_advisory_unlock($LOCK_ID);" >/dev/null 2>&1 || true
  echo "✓ Migration lock released"
}

# Set up trap to release lock on script exit (success or failure)
trap release_migration_lock EXIT

# Acquire lock before running migrations
acquire_migration_lock

# Run database migrations
echo "Running database migrations..."
timeout 180 alembic upgrade head || {
    echo "ERROR: Alembic migrations timed out or failed"
    echo "Lock will be automatically released on exit"
    exit 1
}
echo "✓ Migrations completed successfully"

# Release lock explicitly (trap will also release on exit)
release_migration_lock

# Start the application
echo "Starting uvicorn server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-config=./app/log_conf.yaml
