import json
import logging
import time
from typing import List, Dict, Any, Optional
from google.cloud import storage
from google.cloud.exceptions import NotFound, Conflict
from google.api_core import retry
import google.auth.exceptions

from app.config import GCSConfig, settings

logger = logging.getLogger(__name__)


class GCSStorageManager:
    """Manager for Google Cloud Storage operations with retry logic and error handling."""

    def __init__(self):
        """Initialize GCS client and bucket reference."""
        self._client = None
        self._bucket = None
        self._config = GCSConfig()
        self._is_test_mode = settings.environment == "test"
        self._initialize_client()
        
    @property
    def is_test_mode(self) -> bool:
        """Check if running in test mode."""
        return self._is_test_mode

    def _initialize_client(self):
        """Initialize the GCS client with credentials."""
        # Skip GCS initialization in test environment
        if settings.environment == "test":
            logger.info("Running in test environment, skipping GCS initialization")
            return
            
        try:
            if self._config.credentials_path:
                # Use service account credentials
                self._client = storage.Client.from_service_account_json(
                    json_credentials_path=self._config.credentials_path,
                    project=self._config.project_id,
                )
            else:
                # Use default credentials (e.g., from environment)
                self._client = storage.Client(project=self._config.project_id)

            self._bucket = self._client.bucket(self._config.bucket_name)

            # Test connection
            self._bucket.reload(timeout=self._config.timeout)
            logger.info(
                f"Successfully connected to GCS bucket: {self._config.bucket_name}"
            )

        except google.auth.exceptions.DefaultCredentialsError:
            logger.error(
                "No GCS credentials found. Please set GCS_CREDENTIALS_PATH or configure default credentials."
            )
            raise
        except Exception as e:
            logger.error(f"Failed to initialize GCS client: {str(e)}")
            raise

    @retry.Retry(
        predicate=retry.if_exception_type(Exception),
        initial=1,  # GCSConfig default retry_delay
        maximum=10.0,
        multiplier=2.0,
        timeout=60,  # GCSConfig default timeout
    )
    async def upload_json(self, blob_name: str, data: Dict[str, Any]) -> bool:
        """
        Upload JSON data to GCS bucket.

        Args:
            blob_name: Name/path of the blob in the bucket
            data: Dictionary to store as JSON

        Returns:
            True if successful, False otherwise
        """
        if settings.environment == "test":
            logger.info(f"Test mode: Would upload {blob_name} to GCS")
            return True
            
        try:
            blob = self._bucket.blob(blob_name)

            # Convert data to JSON string
            json_data = json.dumps(data, indent=2)

            # Upload with content type
            blob.upload_from_string(
                json_data, content_type="application/json", timeout=self._config.timeout
            )

            logger.info(f"Successfully uploaded {blob_name} to GCS")
            return True

        except Exception as e:
            logger.error(f"Failed to upload {blob_name} to GCS: {str(e)}")
            return False

    @retry.Retry(
        predicate=retry.if_exception_type(Exception),
        initial=1,  # GCSConfig default retry_delay
        maximum=10.0,
        multiplier=2.0,
        timeout=60,  # GCSConfig default timeout
    )
    async def download_json(self, blob_name: str) -> Optional[Dict[str, Any]]:
        """
        Download and parse JSON from GCS bucket.

        Args:
            blob_name: Name/path of the blob in the bucket

        Returns:
            Parsed JSON data or None if not found
        """
        try:
            blob = self._bucket.blob(blob_name)

            # Download as string
            json_string = blob.download_as_text(timeout=self._config.timeout)

            # Parse JSON
            data = json.loads(json_string)

            logger.debug(f"Successfully downloaded {blob_name} from GCS")
            return data

        except NotFound:
            logger.warning(f"Blob {blob_name} not found in GCS")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from {blob_name}: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Failed to download {blob_name} from GCS: {str(e)}")
            return None

    async def list_blobs(self, prefix: str = "", delimiter: str = None) -> List[str]:
        """
        List all blobs in the bucket with optional prefix filter.

        Args:
            prefix: Filter blobs by prefix (e.g., "stock-data/daily/")
            delimiter: Group results by delimiter (e.g., "/" for directory-like listing)

        Returns:
            List of blob names
        """
        try:
            blobs = self._bucket.list_blobs(
                prefix=prefix, delimiter=delimiter, timeout=self._config.timeout
            )

            blob_names = [blob.name for blob in blobs]

            # If delimiter is used, also include prefixes (directories)
            if delimiter and hasattr(blobs, "prefixes"):
                blob_names.extend(blobs.prefixes)

            logger.debug(f"Found {len(blob_names)} blobs with prefix '{prefix}'")
            return blob_names

        except Exception as e:
            logger.error(f"Failed to list blobs with prefix '{prefix}': {str(e)}")
            return []

    async def blob_exists(self, blob_name: str) -> bool:
        """
        Check if a blob exists in the bucket.

        Args:
            blob_name: Name/path of the blob

        Returns:
            True if blob exists, False otherwise
        """
        try:
            blob = self._bucket.blob(blob_name)
            return blob.exists(timeout=self._config.timeout)
        except Exception as e:
            logger.error(f"Failed to check existence of {blob_name}: {str(e)}")
            return False

    async def delete_blob(self, blob_name: str) -> bool:
        """
        Delete a blob from the bucket.

        Args:
            blob_name: Name/path of the blob to delete

        Returns:
            True if successful, False otherwise
        """
        try:
            blob = self._bucket.blob(blob_name)
            blob.delete(timeout=self._config.timeout)
            logger.info(f"Successfully deleted {blob_name} from GCS")
            return True
        except NotFound:
            logger.warning(f"Blob {blob_name} not found for deletion")
            return False
        except Exception as e:
            logger.error(f"Failed to delete {blob_name}: {str(e)}")
            return False

    async def get_blob_metadata(self, blob_name: str) -> Optional[Dict[str, Any]]:
        """
        Get metadata for a blob.

        Args:
            blob_name: Name/path of the blob

        Returns:
            Dictionary with blob metadata or None if not found
        """
        try:
            blob = self._bucket.blob(blob_name)
            blob.reload(timeout=self._config.timeout)

            return {
                "name": blob.name,
                "size": blob.size,
                "created": blob.time_created,
                "updated": blob.updated,
                "content_type": blob.content_type,
                "etag": blob.etag,
                "md5_hash": blob.md5_hash,
            }
        except NotFound:
            logger.warning(f"Blob {blob_name} not found")
            return None
        except Exception as e:
            logger.error(f"Failed to get metadata for {blob_name}: {str(e)}")
            return None

    async def atomic_write(self, blob_name: str, data: Dict[str, Any]) -> bool:
        """
        Atomically write data by uploading to a temporary blob first.

        Args:
            blob_name: Target blob name
            data: Data to write

        Returns:
            True if successful, False otherwise
        """
        temp_blob_name = f"{blob_name}.tmp.{int(time.time())}"

        try:
            # Upload to temporary blob
            if not await self.upload_json(temp_blob_name, data):
                return False

            # Copy to final location
            temp_blob = self._bucket.blob(temp_blob_name)
            final_blob = self._bucket.blob(blob_name)

            # Use copy_blob for atomic replacement
            self._bucket.copy_blob(
                temp_blob,
                self._bucket,
                new_name=blob_name,
                timeout=self._config.timeout,
            )

            # Delete temporary blob
            await self.delete_blob(temp_blob_name)

            logger.info(f"Atomically wrote {blob_name}")
            return True

        except Exception as e:
            logger.error(f"Atomic write failed for {blob_name}: {str(e)}")
            # Clean up temp blob if it exists
            await self.delete_blob(temp_blob_name)
            return False

    def get_signed_url(
        self, blob_name: str, expiration_minutes: int = 60
    ) -> Optional[str]:
        """
        Generate a signed URL for temporary access to a blob.

        Args:
            blob_name: Name of the blob
            expiration_minutes: URL expiration time in minutes

        Returns:
            Signed URL string or None if failed
        """
        try:
            blob = self._bucket.blob(blob_name)
            url = blob.generate_signed_url(
                version="v4",
                expiration=time.time() + (expiration_minutes * 60),
                method="GET",
            )
            return url
        except Exception as e:
            logger.error(f"Failed to generate signed URL for {blob_name}: {str(e)}")
            return None
