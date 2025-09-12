"""Tests for Simple Cache Service."""

import pytest
import json
from unittest.mock import Mock, patch

from app.services.simple_cache import SimpleCache, get_cache
from app.config import RedisConfig


@pytest.fixture
def mock_redis_client():
    """Mock Upstash Redis client."""
    with patch("app.services.simple_cache.Redis") as mock_redis_class:
        mock_client = Mock()
        mock_redis_class.return_value = mock_client
        mock_client.ping.return_value = True
        yield mock_client


@pytest.mark.asyncio
async def test_cache_initialization_success(mock_redis_client):
    """Test successful cache initialization."""
    with patch.dict(
        "os.environ",
        {
            "CACHE_ENABLED": "true",
            "UPSTASH_REDIS_URL": "https://test.upstash.io",
            "UPSTASH_REDIS_TOKEN": "test-token",
        },
    ):
        cache = SimpleCache()

    assert cache.enabled is True
    assert cache.client is not None
    mock_redis_client.ping.assert_called_once()


@pytest.mark.asyncio
async def test_cache_initialization_disabled():
    """Test cache when disabled."""
    with patch.dict("os.environ", {"CACHE_ENABLED": "false"}):
        cache = SimpleCache()

    assert cache.enabled is False
    assert cache.client is None


@pytest.mark.asyncio
async def test_cache_initialization_connection_error(mock_redis_client):
    """Test cache initialization with connection error."""
    mock_redis_client.ping.side_effect = Exception("Connection failed")

    with patch.dict(
        "os.environ",
        {
            "CACHE_ENABLED": "true",
            "UPSTASH_REDIS_URL": "https://test.upstash.io",
            "UPSTASH_REDIS_TOKEN": "test-token",
        },
    ):
        cache = SimpleCache()

    assert cache.enabled is False
    assert cache.client is None


@pytest.mark.asyncio
async def test_get_success(mock_redis_client):
    """Test successful cache get."""
    mock_redis_client.get.return_value = "test-value"

    with patch.dict(
        "os.environ",
        {
            "CACHE_ENABLED": "true",
            "UPSTASH_REDIS_URL": "https://test.upstash.io",
            "UPSTASH_REDIS_TOKEN": "test-token",
        },
    ):
        cache = SimpleCache()

    result = await cache.get("test-key")
    assert result == "test-value"
    mock_redis_client.get.assert_called_with("test-key")


@pytest.mark.asyncio
async def test_get_miss(mock_redis_client):
    """Test cache miss."""
    mock_redis_client.get.return_value = None

    with patch.dict(
        "os.environ",
        {
            "CACHE_ENABLED": "true",
            "UPSTASH_REDIS_URL": "https://test.upstash.io",
            "UPSTASH_REDIS_TOKEN": "test-token",
        },
    ):
        cache = SimpleCache()

    result = await cache.get("test-key")
    assert result is None


@pytest.mark.asyncio
async def test_get_disabled():
    """Test get when cache is disabled."""
    with patch.dict("os.environ", {"CACHE_ENABLED": "false"}):
        cache = SimpleCache()

    result = await cache.get("test-key")
    assert result is None


@pytest.mark.asyncio
async def test_set_success(mock_redis_client):
    """Test successful cache set."""
    with patch.dict(
        "os.environ",
        {
            "CACHE_ENABLED": "true",
            "UPSTASH_REDIS_URL": "https://test.upstash.io",
            "UPSTASH_REDIS_TOKEN": "test-token",
        },
    ):
        cache = SimpleCache()

    await cache.set("test-key", "test-value", 300)
    mock_redis_client.setex.assert_called_with("test-key", 300, "test-value")


@pytest.mark.asyncio
async def test_delete_success(mock_redis_client):
    """Test successful cache delete."""
    with patch.dict(
        "os.environ",
        {
            "CACHE_ENABLED": "true",
            "UPSTASH_REDIS_URL": "https://test.upstash.io",
            "UPSTASH_REDIS_TOKEN": "test-token",
        },
    ):
        cache = SimpleCache()

    await cache.delete("test-key")
    mock_redis_client.delete.assert_called_with("test-key")


@pytest.mark.asyncio
async def test_clear_pattern(mock_redis_client):
    """Test clearing keys by pattern - currently not implemented for Upstash."""
    with patch.dict(
        "os.environ",
        {
            "CACHE_ENABLED": "true",
            "UPSTASH_REDIS_URL": "https://test.upstash.io",
            "UPSTASH_REDIS_TOKEN": "test-token",
        },
    ):
        cache = SimpleCache()

    # clear_pattern is currently not implemented for Upstash
    await cache.clear_pattern("price:*")
    # Should not raise any errors, but also won't delete anything
    mock_redis_client.delete.assert_not_called()


@pytest.mark.asyncio
async def test_get_json_success(mock_redis_client):
    """Test getting and parsing JSON from cache."""
    test_data = {"symbol": "AAPL", "price": 150.0}
    mock_redis_client.get.return_value = json.dumps(test_data)

    with patch.dict(
        "os.environ",
        {
            "CACHE_ENABLED": "true",
            "UPSTASH_REDIS_URL": "https://test.upstash.io",
            "UPSTASH_REDIS_TOKEN": "test-token",
        },
    ):
        cache = SimpleCache()

    result = await cache.get_json("test-key")
    assert result == test_data


@pytest.mark.asyncio
async def test_get_json_invalid(mock_redis_client):
    """Test getting invalid JSON from cache."""
    mock_redis_client.get.return_value = "invalid-json"

    with patch.dict(
        "os.environ",
        {
            "CACHE_ENABLED": "true",
            "UPSTASH_REDIS_URL": "https://test.upstash.io",
            "UPSTASH_REDIS_TOKEN": "test-token",
        },
    ):
        cache = SimpleCache()

    result = await cache.get_json("test-key")
    assert result is None


@pytest.mark.asyncio
async def test_set_json_success(mock_redis_client):
    """Test setting JSON in cache."""
    test_data = {"symbol": "AAPL", "price": 150.0}

    with patch.dict(
        "os.environ",
        {
            "CACHE_ENABLED": "true",
            "UPSTASH_REDIS_URL": "https://test.upstash.io",
            "UPSTASH_REDIS_TOKEN": "test-token",
        },
    ):
        cache = SimpleCache()

    await cache.set_json("test-key", test_data, 300)

    # Verify JSON was serialized correctly
    call_args = mock_redis_client.setex.call_args
    assert call_args[0][0] == "test-key"
    assert call_args[0][1] == 300
    assert json.loads(call_args[0][2]) == test_data


def test_is_connected_success(mock_redis_client):
    """Test checking connection status."""
    with patch.dict(
        "os.environ",
        {
            "CACHE_ENABLED": "true",
            "UPSTASH_REDIS_URL": "https://test.upstash.io",
            "UPSTASH_REDIS_TOKEN": "test-token",
        },
    ):
        cache = SimpleCache()

    assert cache.is_connected() is True

    # Test disconnected
    mock_redis_client.ping.side_effect = Exception()
    assert cache.is_connected() is False


def test_get_cache_singleton():
    """Test cache singleton pattern."""
    cache1 = get_cache()
    cache2 = get_cache()
    assert cache1 is cache2
