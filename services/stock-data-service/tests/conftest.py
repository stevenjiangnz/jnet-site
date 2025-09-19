import pytest
import tempfile
import shutil
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient


# Mock GCS before importing the app
@pytest.fixture(scope="session", autouse=True)
def mock_gcs_for_tests():
    """Mock GCS for all tests to prevent credential errors in CI/CD."""
    with patch.dict(
        "os.environ",
        {
            "GCS_CREDENTIALS_PATH": "",
            "GCS_PROJECT_ID": "test-project",
            "GCS_BUCKET_NAME": "test-bucket",
            "ENVIRONMENT": "test",
        },
    ):
        # Mock the GCS client at the module level
        mock_storage_client = MagicMock()
        mock_bucket = MagicMock()
        mock_storage_client.bucket.return_value = mock_bucket
        mock_bucket.reload.return_value = None

        with patch("google.cloud.storage.Client", return_value=mock_storage_client):
            yield


@pytest.fixture
def client():
    from app.main import app

    return TestClient(app)


@pytest.fixture
def temp_data_dir():
    """Create a temporary data directory for testing"""
    from app.config import settings

    temp_dir = tempfile.mkdtemp()
    original_dir = settings.data_directory
    settings.data_directory = temp_dir

    yield temp_dir

    # Cleanup
    shutil.rmtree(temp_dir)
    settings.data_directory = original_dir


@pytest.fixture
def mock_gcs_storage():
    """Provide a mock GCS storage instance for tests."""
    mock_instance = AsyncMock()
    mock_instance.upload_json.return_value = True
    mock_instance.download_json.return_value = None
    mock_instance.list_blobs.return_value = []
    mock_instance.delete_blob.return_value = True
    return mock_instance
