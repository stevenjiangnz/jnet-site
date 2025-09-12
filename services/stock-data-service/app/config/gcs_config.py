import os
from pathlib import Path

GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "jnet-stock-data")
GCS_PROJECT_ID = os.getenv("GCS_PROJECT_ID")
GCS_CREDENTIALS_PATH = os.getenv("GCS_CREDENTIALS_PATH")

# If credentials path is provided but relative, make it absolute
if GCS_CREDENTIALS_PATH and not Path(GCS_CREDENTIALS_PATH).is_absolute():
    GCS_CREDENTIALS_PATH = str(Path.cwd() / GCS_CREDENTIALS_PATH)

# Storage configuration
GCS_TIMEOUT = 60  # seconds
GCS_RETRY_ATTEMPTS = 3
GCS_RETRY_DELAY = 1  # seconds

# Validate required settings in production
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
if ENVIRONMENT == "production":
    if not GCS_PROJECT_ID:
        raise ValueError("GCS_PROJECT_ID must be set in production")
    if not GCS_CREDENTIALS_PATH or not Path(GCS_CREDENTIALS_PATH).exists():
        raise ValueError("Valid GCS_CREDENTIALS_PATH must be set in production")