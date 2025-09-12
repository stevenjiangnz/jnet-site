"""Simple cache service using Upstash Redis REST API."""

import json
import logging
from typing import Optional
from upstash_redis import Redis

from app.config import RedisConfig

logger = logging.getLogger(__name__)


class SimpleCache:
    """Simple Redis cache with graceful degradation using Upstash REST API."""
    
    def __init__(self):
        """Initialize cache service."""
        self._config = RedisConfig()
        self.enabled = self._config.cache_enabled
        self.client = None
        
        if self.enabled:
            self._connect()
    
    def _connect(self):
        """Connect to Upstash Redis."""
        if not self._config.upstash_redis_url or not self._config.upstash_redis_token:
            logger.warning("Redis credentials not configured, cache disabled")
            self.enabled = False
            return
            
        try:
            # Initialize Upstash Redis client
            self.client = Redis(
                url=self._config.upstash_redis_url,
                token=self._config.upstash_redis_token
            )
            
            # Test connection with a ping
            self.client.ping()
            logger.info("Successfully connected to Upstash Redis cache")
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
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
            # Note: Upstash supports pattern-based operations differently
            # For now, we'll skip this as it requires scanning all keys
            logger.warning(f"Pattern-based deletion not implemented for Upstash Redis")
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