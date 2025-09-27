# ASX Price Updater Job Runner
FROM python:3.11-slim

WORKDIR /app

# Copy API service code (contains the job implementation)
COPY services/api-service/pyproject.toml services/api-service/uv.lock ./
COPY services/api-service/app ./app

# Install uv and dependencies
RUN pip install uv && \
    uv sync --frozen --no-dev

# Copy job runner
COPY services/job-runners/asx-price-updater/main.py ./

# Run the job
CMD ["uv", "run", "python", "main.py"]