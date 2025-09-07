import pytest
import tempfile
import shutil
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def temp_data_dir():
    """Create a temporary data directory for testing"""
    temp_dir = tempfile.mkdtemp()
    original_dir = settings.data_directory
    settings.data_directory = temp_dir

    yield temp_dir

    # Cleanup
    shutil.rmtree(temp_dir)
    settings.data_directory = original_dir
