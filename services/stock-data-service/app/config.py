import os
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

VERSION = "1.0.0"


class Settings(BaseSettings):
    environment: str = os.getenv("ENVIRONMENT", "development")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    data_directory: str = os.getenv("DATA_DIRECTORY", "./data")
    
    api_v1_prefix: str = "/api/v1"
    
    max_file_age_days: int = 365
    default_data_format: str = "json"
    
    rate_limit_calls: int = 5
    rate_limit_period: int = 1
    
    class Config:
        env_file = ".env"


settings = Settings()