#!/bin/bash
set -e

echo "Starting budget-app backend..."

# Wait for database to be ready
echo "Waiting for database to be ready..."
until PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; do
  echo "Postgres is unavailable - sleeping for 2 seconds"
  sleep 2
done
echo "Postgres is up and ready!"

# Run database migrations
# Alembic has built-in locking to prevent concurrent migrations
echo "Running database migrations..."
timeout 60 alembic upgrade head || {
    echo "ERROR: Alembic migrations timed out or failed"
    exit 1
}
echo "Migrations completed successfully"

# Start the application
echo "Starting uvicorn server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
