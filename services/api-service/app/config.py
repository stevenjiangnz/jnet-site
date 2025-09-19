from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application
    environment: str = "development"
    log_level: str = "INFO"
    api_key: str = "test-api-key"

    # Services
    stock_data_service_url: str = "http://localhost:9000"
    supabase_url: Optional[str] = None
    supabase_service_key: Optional[str] = None

    # Google Cloud Storage
    gcs_bucket_name: Optional[str] = None
    gcs_project_id: Optional[str] = None
    gcs_credentials_path: Optional[str] = None

    # Redis Cache
    upstash_redis_url: Optional[str] = None
    upstash_redis_token: Optional[str] = None

    # Notifications
    pushover_app_token: Optional[str] = None
    pushover_user_key: Optional[str] = None
    sendgrid_api_key: Optional[str] = None
    email_from: str = "noreply@jnet-solution.com"

    # Backtesting
    backtest_max_workers: int = 4
    backtest_timeout: int = 300

    # Rate Limiting
    rate_limit_calls: int = 100
    rate_limit_period: int = 60

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
