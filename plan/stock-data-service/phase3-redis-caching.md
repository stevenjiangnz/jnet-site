# Phase 3: Redis Caching Implementation
**Duration**: Week 5 (5 working days)

## Overview
Implement Upstash Redis as a simple, serverless caching layer to improve API response times for frequently accessed stock data. Focus on TTL-based caching with graceful fallback to GCS.

## Prerequisites
- [ ] Phase 1 & 2 completed and stable
- [ ] Upstash Redis account created
- [ ] Redis connection credentials obtained
- [ ] Performance baseline metrics collected

## Implementation Tasks

### Day 1: Upstash Redis Setup & Configuration
**Objective**: Set up Redis connection and basic configuration

1. **Add Redis Dependencies**
   ```bash
   # Update pyproject.toml
   redis==5.0.1
   hiredis==2.2.3  # Optional: C parser for better performance
   ```

2. **Create Redis Configuration**
   - File: `app/config/redis_config.py`
   ```python
   UPSTASH_REDIS_URL = os.getenv("UPSTASH_REDIS_URL")
   UPSTASH_REDIS_TOKEN = os.getenv("UPSTASH_REDIS_TOKEN")
   CACHE_ENABLED = os.getenv("CACHE_ENABLED", "true").lower() == "true"
   
   # Cache TTL settings (in seconds)
   CACHE_TTL_LATEST_PRICE = 300  # 5 minutes
   CACHE_TTL_RECENT_DATA = 3600  # 1 hour
   CACHE_TTL_SYMBOL_LIST = 21600  # 6 hours
   ```

3. **Update Environment Files**
   ```bash
   # .env.local
   UPSTASH_REDIS_URL=https://xxxxx.upstash.io
   UPSTASH_REDIS_TOKEN=xxxxx
   CACHE_ENABLED=true
   
   # .env.production
   # Same structure with production values
   ```

### Day 2: Simple Cache Service Implementation
**Objective**: Build a simple, robust cache service

1. **Create Cache Service**
   - File: `app/services/simple_cache.py`
   ```python
   from typing import Optional
   import json
   import redis
   from app.config.redis_config import *
   
   class SimpleCache:
       def __init__(self):
           self.enabled = CACHE_ENABLED
           self.client = None
           if self.enabled:
               self._connect()
       
       def _connect(self):
           try:
               self.client = redis.from_url(
                   UPSTASH_REDIS_URL,
                   headers={"Authorization": f"Bearer {UPSTASH_REDIS_TOKEN}"}
               )
               self.client.ping()
           except Exception as e:
               logger.error(f"Redis connection failed: {e}")
               self.enabled = False
       
       async def get(self, key: str) -> Optional[str]:
           if not self.enabled or not self.client:
               return None
           
           try:
               value = self.client.get(key)
               return value.decode() if value else None
           except Exception as e:
               logger.warning(f"Cache get failed for {key}: {e}")
               return None
       
       async def set(self, key: str, value: str, ttl: int):
           if not self.enabled or not self.client:
               return
           
           try:
               self.client.setex(key, ttl, value)
           except Exception as e:
               logger.warning(f"Cache set failed for {key}: {e}")
       
       async def delete(self, key: str):
           if not self.enabled or not self.client:
               return
           
           try:
               self.client.delete(key)
           except Exception as e:
               logger.warning(f"Cache delete failed for {key}: {e}")
       
       async def clear_pattern(self, pattern: str):
           """Clear all keys matching pattern"""
           if not self.enabled or not self.client:
               return
           
           try:
               for key in self.client.scan_iter(match=pattern):
                   self.client.delete(key)
           except Exception as e:
               logger.warning(f"Cache clear failed for pattern {pattern}: {e}")
   ```

2. **Create Cache Key Manager**
   - File: `app/services/cache_keys.py`
   ```python
   class CacheKeys:
       @staticmethod
       def latest_price(symbol: str) -> str:
           return f"price:latest:{symbol}"
       
       @staticmethod
       def recent_data(symbol: str) -> str:
           return f"data:recent:{symbol}"
       
       @staticmethod
       def symbol_list() -> str:
           return "symbols:list"
       
       @staticmethod
       def symbol_info(symbol: str) -> str:
           return f"symbol:info:{symbol}"
   ```

### Day 3: API Integration
**Objective**: Integrate caching into existing API endpoints

1. **Update Data Service with Caching**
   - File: `app/services/stock_data_service.py`
   ```python
   class StockDataService:
       def __init__(self):
           self.cache = SimpleCache()
           self.storage = GCSStorageManager()
       
       async def get_latest_price(self, symbol: str) -> dict:
           # Try cache first
           cache_key = CacheKeys.latest_price(symbol)
           cached = await self.cache.get(cache_key)
           
           if cached:
               return json.loads(cached)
           
           # Fallback to GCS
           data = await self._get_from_storage(symbol)
           latest = data["data_points"][-1] if data["data_points"] else None
           
           if latest:
               await self.cache.set(
                   cache_key, 
                   json.dumps(latest), 
                   CACHE_TTL_LATEST_PRICE
               )
           
           return latest
       
       async def get_recent_data(self, symbol: str, days: int = 30) -> List[dict]:
           # Similar pattern with CACHE_TTL_RECENT_DATA
           pass
   ```

2. **Cache Warming Strategy**
   - File: `app/services/cache_warmer.py`
   ```python
   class CacheWarmer:
       async def warm_popular_symbols(self, symbols: List[str]):
           """Pre-populate cache with popular symbols"""
           for symbol in symbols:
               try:
                   await self.data_service.get_latest_price(symbol)
                   await self.data_service.get_recent_data(symbol)
               except Exception as e:
                   logger.error(f"Cache warming failed for {symbol}: {e}")
   ```

### Day 4: Cache Management & Monitoring
**Objective**: Add cache management endpoints and monitoring

1. **Cache Management Endpoints**
   - File: `app/api/v1/cache.py`
   ```python
   @router.post("/cache/clear/{symbol}")
   async def clear_symbol_cache(symbol: str):
       """Clear all cache entries for a symbol"""
       await cache.clear_pattern(f"*:{symbol}")
       return {"status": "cleared", "symbol": symbol}
   
   @router.get("/cache/stats")
   async def get_cache_stats():
       """Get cache statistics"""
       info = await cache.get_info()
       return {
           "enabled": cache.enabled,
           "connected": cache.client is not None,
           "memory_used": info.get("used_memory_human"),
           "keys": info.get("db0", {}).get("keys", 0)
       }
   ```

2. **Cache Metrics Collection**
   - Track cache hit/miss rates
   - Monitor cache response times
   - Alert on connection failures
   ```python
   class CacheMetrics:
       def __init__(self):
           self.hits = 0
           self.misses = 0
           self.errors = 0
       
       def record_hit(self):
           self.hits += 1
       
       def record_miss(self):
           self.misses += 1
       
       def get_hit_rate(self) -> float:
           total = self.hits + self.misses
           return (self.hits / total * 100) if total > 0 else 0
   ```

3. **Graceful Degradation**
   - Continue operating if Redis is down
   - Log cache failures without breaking requests
   - Automatic reconnection attempts

### Day 5: Testing & Performance Optimization
**Objective**: Ensure reliability and optimize performance

1. **Unit Tests**
   - File: `tests/test_cache_service.py`
   ```python
   @pytest.mark.asyncio
   async def test_cache_fallback():
       """Test graceful degradation when cache is unavailable"""
       cache = SimpleCache()
       cache.enabled = False
       
       result = await cache.get("test_key")
       assert result is None  # Should not throw exception
   
   @pytest.mark.asyncio
   async def test_cache_ttl():
       """Test TTL expiration"""
       cache = SimpleCache()
       await cache.set("test_key", "test_value", 1)
       
       value = await cache.get("test_key")
       assert value == "test_value"
       
       await asyncio.sleep(2)
       value = await cache.get("test_key")
       assert value is None
   ```

2. **Performance Testing**
   ```python
   # Load test script
   async def load_test_cache():
       symbols = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA"]
       tasks = []
       
       # Test cache performance
       for _ in range(100):
           for symbol in symbols:
               tasks.append(get_latest_price(symbol))
       
       start = time.time()
       await asyncio.gather(*tasks)
       duration = time.time() - start
       
       print(f"Completed {len(tasks)} requests in {duration:.2f}s")
       print(f"Average response time: {duration/len(tasks)*1000:.2f}ms")
   ```

3. **Cache Optimization**
   - Implement batch operations where possible
   - Use pipeline for multiple operations
   - Compress large cached values if needed

## Cache Strategies

### Latest Price Cache
```python
# Key: price:latest:AAPL
# TTL: 5 minutes
# Use case: Real-time price displays
{
    "date": "2024-12-12",
    "close": 195.71,
    "volume": 48087703,
    "change": 1.23,
    "change_percent": 0.63
}
```

### Recent Data Cache
```python
# Key: data:recent:AAPL
# TTL: 1 hour
# Use case: Charts and analysis
[
    {"date": "2024-11-12", "open": 190.0, ...},
    {"date": "2024-11-13", "open": 191.5, ...},
    # ... last 30 days
]
```

### Symbol List Cache
```python
# Key: symbols:list
# TTL: 6 hours
# Use case: Dropdown menus, search
["AAPL", "GOOGL", "MSFT", "AMZN", ...]
```

## Deliverables
1. Simple cache service with Upstash Redis
2. Cache integration in all relevant endpoints
3. Cache management endpoints
4. Performance metrics and monitoring
5. Comprehensive test suite

## Success Criteria
- [ ] Cache hit rate > 80% for popular queries
- [ ] Response time < 100ms for cached data
- [ ] Zero downtime when cache unavailable
- [ ] Automated cache warming for popular symbols
- [ ] Clear performance improvement metrics

## Rollback Plan
1. Feature flag to disable cache instantly
2. All operations work without cache
3. No data dependency on cache
4. Easy cache flush capability

## Dependencies
- Upstash Redis account and credentials
- Existing GCS storage layer working
- Performance baseline established

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Redis connection failures | Graceful fallback to GCS |
| Cache stampede | Implement cache warming |
| Memory limits | Monitor usage, implement eviction |
| Stale data | Appropriate TTL values |
| Cost overruns | Monitor Upstash usage |

## Post-Implementation
- Monitor cache hit rates for first week
- Analyze performance improvements
- Adjust TTL values based on usage patterns
- Document cache strategies
- Prepare for Phase 4 (Weekly Aggregation)