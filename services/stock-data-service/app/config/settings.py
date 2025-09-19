from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application
    environment: str = "development"
    log_level: str = "INFO"
    data_directory: str = "./data"

    # API
    api_v1_prefix: str = "/api/v1"

    # Storage
    max_file_age_days: int = 365
    default_data_format: str = "json"

    # Weekly data settings
    weekly_data_enabled: bool = True
    weekly_aggregation_delay: int = 0  # Process immediately
    weekly_data_retention_days: int = 3650  # 10 years

    # Rate Limiting
    rate_limit_calls: int = 5
    rate_limit_period: int = 1

    # GCS
    gcs_bucket_name: str = ""
    gcs_project_id: str = ""
    gcs_credentials_path: str = ""

    # Redis
    upstash_redis_url: str = ""
    upstash_redis_token: str = ""
    cache_enabled: bool = False

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

# Version
VERSION = "1.0.0"

# Ensure data directory exists
Path(settings.data_directory).mkdir(exist_ok=True)
