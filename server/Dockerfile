# Single-stage Dockerfile for Budget Tracker API
FROM python:3.13-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

# Install system dependencies and uv
RUN apt-get update && apt-get install -y \
    build-essential \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    && pip install uv

# Set working directory
WORKDIR /code

# Copy dependency files first for better caching
COPY pyproject.toml uv.lock* ./

# Install dependencies
RUN uv venv .venv && uv sync --no-install-project

# Copy the rest of the application
COPY . .

# Make entrypoint script executable
RUN chmod +x /code/entrypoint.sh

ENV VIRTUAL_ENV=/code/.venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Use the entrypoint script
ENTRYPOINT ["/code/entrypoint.sh"]