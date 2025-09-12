"""Tests for GCS Storage Manager."""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from google.cloud.exceptions import NotFound

from app.services.gcs_storage import GCSStorageManager
from app.config import GCSConfig


@pytest.fixture
def mock_storage_client():
    """Mock Google Cloud Storage client."""
    with patch("app.services.gcs_storage.storage.Client") as mock_client:
        # Mock bucket
        mock_bucket = Mock()
        mock_client_instance = Mock()
        mock_client_instance.bucket.return_value = mock_bucket
        mock_client.from_service_account_json.return_value = mock_client_instance
        mock_client.return_value = mock_client_instance

        yield mock_client_instance, mock_bucket


@pytest.mark.asyncio
async def test_upload_json_success(mock_storage_client):
    """Test successful JSON upload."""
    client, bucket = mock_storage_client
    mock_blob = Mock()
    bucket.blob.return_value = mock_blob

    # Initialize manager with mocked environment
    with patch.dict(
        "os.environ",
        {
            "GCS_CREDENTIALS_PATH": "test.json",
            "GCS_BUCKET_NAME": "test-bucket",
            "GCS_PROJECT_ID": "test-project",
        },
    ):
        manager = GCSStorageManager()

    # Test upload
    data = {"symbol": "AAPL", "price": 150.0}
    result = await manager.upload_json("test/data.json", data)

    assert result is True
    mock_blob.upload_from_string.assert_called_once()

    # Verify JSON formatting
    call_args = mock_blob.upload_from_string.call_args
    uploaded_content = call_args[0][0]
    assert json.loads(uploaded_content) == data


@pytest.mark.asyncio
async def test_download_json_success(mock_storage_client):
    """Test successful JSON download."""
    client, bucket = mock_storage_client
    mock_blob = Mock()
    bucket.blob.return_value = mock_blob

    # Mock download
    test_data = {"symbol": "AAPL", "price": 150.0}
    mock_blob.download_as_text.return_value = json.dumps(test_data)

    # Initialize manager with mocked environment
    with patch.dict(
        "os.environ",
        {
            "GCS_CREDENTIALS_PATH": "test.json",
            "GCS_BUCKET_NAME": "test-bucket",
            "GCS_PROJECT_ID": "test-project",
        },
    ):
        manager = GCSStorageManager()

    # Test download
    result = await manager.download_json("test/data.json")

    assert result == test_data
    mock_blob.download_as_text.assert_called_once()


@pytest.mark.asyncio
async def test_download_json_not_found(mock_storage_client):
    """Test download when blob not found."""
    client, bucket = mock_storage_client
    mock_blob = Mock()
    bucket.blob.return_value = mock_blob

    # Mock not found error
    mock_blob.download_as_text.side_effect = NotFound("Blob not found")

    # Initialize manager with mocked environment
    with patch.dict(
        "os.environ",
        {
            "GCS_CREDENTIALS_PATH": "test.json",
            "GCS_BUCKET_NAME": "test-bucket",
            "GCS_PROJECT_ID": "test-project",
        },
    ):
        manager = GCSStorageManager()

    # Test download
    result = await manager.download_json("test/missing.json")

    assert result is None


@pytest.mark.asyncio
async def test_list_blobs(mock_storage_client):
    """Test listing blobs."""
    client, bucket = mock_storage_client

    # Mock blob objects
    mock_blob1 = Mock()
    mock_blob1.name = "stock-data/daily/AAPL.json"
    mock_blob2 = Mock()
    mock_blob2.name = "stock-data/daily/GOOGL.json"

    bucket.list_blobs.return_value = [mock_blob1, mock_blob2]

    # Initialize manager with mocked environment
    with patch.dict(
        "os.environ",
        {
            "GCS_CREDENTIALS_PATH": "test.json",
            "GCS_BUCKET_NAME": "test-bucket",
            "GCS_PROJECT_ID": "test-project",
        },
    ):
        manager = GCSStorageManager()

    # Test list
    result = await manager.list_blobs("stock-data/daily/")

    assert len(result) == 2
    assert "stock-data/daily/AAPL.json" in result
    assert "stock-data/daily/GOOGL.json" in result


@pytest.mark.asyncio
async def test_blob_exists(mock_storage_client):
    """Test blob existence check."""
    client, bucket = mock_storage_client
    mock_blob = Mock()
    bucket.blob.return_value = mock_blob

    # Test exists
    mock_blob.exists.return_value = True

    # Initialize manager with mocked environment
    with patch.dict(
        "os.environ",
        {
            "GCS_CREDENTIALS_PATH": "test.json",
            "GCS_BUCKET_NAME": "test-bucket",
            "GCS_PROJECT_ID": "test-project",
        },
    ):
        manager = GCSStorageManager()

    result = await manager.blob_exists("test/data.json")
    assert result is True

    # Test not exists
    mock_blob.exists.return_value = False
    result = await manager.blob_exists("test/missing.json")
    assert result is False


@pytest.mark.asyncio
async def test_atomic_write(mock_storage_client):
    """Test atomic write operation."""
    client, bucket = mock_storage_client
    mock_temp_blob = Mock()
    mock_final_blob = Mock()

    # Setup bucket to return different blobs
    def blob_side_effect(name):
        if "tmp" in name:
            return mock_temp_blob
        return mock_final_blob

    bucket.blob.side_effect = blob_side_effect
    bucket.copy_blob.return_value = None

    # Initialize manager with mocked environment
    with patch.dict(
        "os.environ",
        {
            "GCS_CREDENTIALS_PATH": "test.json",
            "GCS_BUCKET_NAME": "test-bucket",
            "GCS_PROJECT_ID": "test-project",
        },
    ):
        manager = GCSStorageManager()

    # Test atomic write
    data = {"symbol": "AAPL", "price": 150.0}

    # Create async mocks
    async def mock_upload_json(*args, **kwargs):
        return True

    async def mock_delete_blob(*args, **kwargs):
        return True

    with patch.object(manager, "upload_json", side_effect=mock_upload_json):
        with patch.object(manager, "delete_blob", side_effect=mock_delete_blob):
            result = await manager.atomic_write("test/data.json", data)

    assert result is True
    bucket.copy_blob.assert_called_once()


@pytest.mark.asyncio
async def test_get_blob_metadata(mock_storage_client):
    """Test getting blob metadata."""
    client, bucket = mock_storage_client
    mock_blob = Mock()
    bucket.blob.return_value = mock_blob

    # Mock metadata
    mock_blob.name = "test/data.json"
    mock_blob.size = 1024
    mock_blob.time_created = "2024-01-01T00:00:00Z"
    mock_blob.updated = "2024-01-01T00:00:00Z"
    mock_blob.content_type = "application/json"
    mock_blob.etag = "etag123"
    mock_blob.md5_hash = "md5123"

    # Initialize manager with mocked environment
    with patch.dict(
        "os.environ",
        {
            "GCS_CREDENTIALS_PATH": "test.json",
            "GCS_BUCKET_NAME": "test-bucket",
            "GCS_PROJECT_ID": "test-project",
        },
    ):
        manager = GCSStorageManager()

    # Test metadata
    result = await manager.get_blob_metadata("test/data.json")

    assert result is not None
    assert result["name"] == "test/data.json"
    assert result["size"] == 1024
    assert result["content_type"] == "application/json"


def test_no_credentials():
    """Test initialization without credentials."""
    with patch.dict(
        "os.environ",
        {
            "GCS_CREDENTIALS_PATH": "",
            "GCS_PROJECT_ID": "test-project",
            "GCS_BUCKET_NAME": "test-bucket",
        },
    ):
        with patch("app.services.gcs_storage.storage.Client") as mock_client:
            # Should use default credentials
            manager = GCSStorageManager()
            mock_client.assert_called_with(project="test-project")
