.PHONY: install dev test lint format clean migrate upgrade downgrade

# Install dependencies
install:
	pip install -r requirements.txt

# Install development dependencies
dev:
	pip install -r requirements.txt
	pip install -e ".[dev]"

# Run the development server
run:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --timeout-keep-alive 5 --timeout-graceful-shutdown 2

# Run tests
test:
	pytest -v

# Run tests with coverage
test-cov:
	pytest --cov=app --cov-report=html --cov-report=term

# Lint code
lint:
	flake8 app/
	black --check app/
	isort --check-only app/

# Format code
format:
	black app/
	isort app/

# Clean cache and build files
clean:
	find . -type d -name __pycache__ -delete
	find . -name "*.pyc" -delete
	rm -rf .pytest_cache/
	rm -rf htmlcov/
	rm -rf .coverage

# Database migrations
migrate:
	alembic revision --autogenerate -m "$(msg)"

# Apply migrations
upgrade:
	alembic upgrade head

# Rollback migration
downgrade:
	alembic downgrade -1

# Start services with Docker
docker-up:
	docker-compose up -d

# Stop services
docker-down:
	docker-compose down

# View logs
docker-logs:
	docker-compose logs -f app

# Initialize database with sample data
init-db:
	python scripts/init_database.py

# Create initial admin user
create-admin:
	python scripts/create_admin.py