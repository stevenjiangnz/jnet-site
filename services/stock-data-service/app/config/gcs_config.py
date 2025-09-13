import os
from pathlib import Path
from dataclasses import dataclass, field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


@dataclass
class GCSConfig:
    bucket_name: str = field(
        default_factory=lambda: os.getenv("GCS_BUCKET_NAME", "jnet-site-stock-data")
    )
    project_id: str = field(default_factory=lambda: os.getenv("GCS_PROJECT_ID", ""))
    credentials_path: str = field(
        default_factory=lambda: os.getenv("GCS_CREDENTIALS_PATH", "")
    )
    timeout: int = 60  # seconds
    retry_attempts: int = 3
    retry_delay: int = 1  # seconds

    def __post_init__(self):
        # If credentials path is provided but relative, make it absolute
        if self.credentials_path and not Path(self.credentials_path).is_absolute():
            self.credentials_path = str(Path.cwd() / self.credentials_path)

        # Validate required settings in production
        environment = os.getenv("ENVIRONMENT", "development")
        if environment == "production":
            if not self.project_id:
                raise ValueError("GCS_PROJECT_ID must be set in production")
            # In Cloud Run, we use default service account credentials
            # Only validate credentials path if it's provided
            if self.credentials_path and not Path(self.credentials_path).exists():
                raise ValueError("GCS_CREDENTIALS_PATH is set but file does not exist")
