"""Simple cache service using Upstash Redis."""

import json
import logging
from typing import Optional
import redis
from redis.exceptions import ConnectionError, TimeoutError

from app.config.redis_config import (
    UPSTASH_REDIS_URL,
    UPSTASH_REDIS_TOKEN,
    CACHE_ENABLED,
    REDIS_SOCKET_CONNECT_TIMEOUT,
    REDIS_DECODE_RESPONSES
)

logger = logging.getLogger(__name__)


class SimpleCache:
    """Simple Redis cache with graceful degradation."""
    
    def __init__(self):
        """Initialize cache service."""
        self.enabled = CACHE_ENABLED
        self.client = None
        
        if self.enabled:
            self._connect()
    
    def _connect(self):
        """Connect to Upstash Redis."""
        if not UPSTASH_REDIS_URL or not UPSTASH_REDIS_TOKEN:
            logger.warning("Redis credentials not configured, cache disabled")
            self.enabled = False
            return
            
        try:
            # Parse Upstash URL and create connection
            self.client = redis.Redis.from_url(
                UPSTASH_REDIS_URL,
                decode_responses=REDIS_DECODE_RESPONSES,
                socket_connect_timeout=REDIS_SOCKET_CONNECT_TIMEOUT,
                password=UPSTASH_REDIS_TOKEN
            )
            
            # Test connection
            self.client.ping()
            logger.info("Successfully connected to Redis cache")
            
        except (ConnectionError, TimeoutError) as e:
            logger.error(f"Redis connection failed: {str(e)}")
            self.enabled = False
            self.client = None
        except Exception as e:
            logger.error(f"Unexpected error connecting to Redis: {str(e)}")
            self.enabled = False
            self.client = None
    
    async def get(self, key: str) -> Optional[str]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value as string or None
        """
        if not self.enabled or not self.client:
            return None
        
        try:
            value = self.client.get(key)
            if value:
                logger.debug(f"Cache hit for key: {key}")
            return value
        except Exception as e:
            logger.warning(f"Cache get failed for {key}: {str(e)}")
            return None
    
    async def set(self, key: str, value: str, ttl: int):
        """
        Set value in cache with TTL.
        
        Args:
            key: Cache key
            value: Value to cache (as string)
            ttl: Time to live in seconds
        """
        if not self.enabled or not self.client:
            return
        
        try:
            self.client.setex(key, ttl, value)
            logger.debug(f"Cached key: {key} with TTL: {ttl}s")
        except Exception as e:
            logger.warning(f"Cache set failed for {key}: {str(e)}")
    
    async def delete(self, key: str):
        """
        Delete key from cache.
        
        Args:
            key: Cache key to delete
        """
        if not self.enabled or not self.client:
            return
        
        try:
            self.client.delete(key)
            logger.debug(f"Deleted cache key: {key}")
        except Exception as e:
            logger.warning(f"Cache delete failed for {key}: {str(e)}")
    
    async def clear_pattern(self, pattern: str):
        """
        Clear all keys matching pattern.
        
        Args:
            pattern: Pattern to match (e.g., "price:*")
        """
        if not self.enabled or not self.client:
            return
        
        try:
            keys = list(self.client.scan_iter(match=pattern))
            if keys:
                self.client.delete(*keys)
                logger.info(f"Cleared {len(keys)} cache keys matching pattern: {pattern}")
        except Exception as e:
            logger.warning(f"Cache clear failed for pattern {pattern}: {str(e)}")
    
    async def get_json(self, key: str) -> Optional[dict]:
        """
        Get and parse JSON value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Parsed JSON object or None
        """
        value = await self.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse JSON from cache key: {key}")
                return None
        return None
    
    async def set_json(self, key: str, obj: dict, ttl: int):
        """
        Serialize and cache JSON object.
        
        Args:
            key: Cache key
            obj: Object to cache
            ttl: Time to live in seconds
        """
        try:
            value = json.dumps(obj)
            await self.set(key, value, ttl)
        except (TypeError, ValueError) as e:
            logger.warning(f"Failed to serialize object for cache key {key}: {str(e)}")
    
    def is_connected(self) -> bool:
        """Check if cache is connected and operational."""
        if not self.enabled or not self.client:
            return False
        
        try:
            self.client.ping()
            return True
        except Exception:
            return False


# Global cache instance
cache_instance = None


def get_cache() -> SimpleCache:
    """Get or create cache instance."""
    global cache_instance
    if cache_instance is None:
        cache_instance = SimpleCache()
    return cache_instance