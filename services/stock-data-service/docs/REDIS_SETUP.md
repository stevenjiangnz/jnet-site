# Upstash Redis Setup Guide

This guide will help you set up Upstash Redis for the Stock Data Service caching layer.

## Why Upstash Redis?

Upstash Redis is a serverless Redis service that:
- Uses REST API instead of TCP connections (perfect for serverless/containerized environments)
- Has a generous free tier (10,000 requests per day)
- Requires no connection pooling or persistent connections
- Works seamlessly with Cloud Run and other serverless platforms

## Step 1: Create an Upstash Account

1. Go to [Upstash Console](https://console.upstash.com/)
2. Sign up for a free account
3. Verify your email

## Step 2: Create a Redis Database

1. Click "Create Database"
2. Configuration:
   - **Name**: `stock-data-cache` (or your preferred name)
   - **Region**: Choose closest to your GCS bucket region
   - **Type**: Regional (for free tier)
   - **TLS**: Enabled (default)
3. Click "Create"

## Step 3: Get Connection Details

After creation, you'll see your database details:

1. **REST URL**: `https://your-instance.upstash.io`
2. **REST Token**: A long string starting with `AX...`

Copy these values - you'll need them for configuration.

## Step 4: Configure the Service

Update your `.env` file:

```bash
# Upstash Redis (REST API)
UPSTASH_REDIS_URL=https://your-instance.upstash.io
UPSTASH_REDIS_TOKEN=AXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CACHE_ENABLED=true
```

## Step 5: Test Connection

Run this test script to verify your setup:

```python
# test_redis.py
import os
from upstash_redis import Redis
from dotenv import load_dotenv

load_dotenv()

# Initialize client
redis = Redis(
    url=os.getenv("UPSTASH_REDIS_URL"),
    token=os.getenv("UPSTASH_REDIS_TOKEN")
)

# Test operations
redis.set("test:key", "Hello from Stock Data Service!")
value = redis.get("test:key")
print(f"Retrieved: {value}")

# Test with expiry
redis.setex("test:ttl", 60, "This expires in 60 seconds")
ttl = redis.ttl("test:ttl")
print(f"TTL: {ttl} seconds")

# Cleanup
redis.delete("test:key", "test:ttl")
print("Test completed successfully!")
```

## Caching Strategy

The service implements intelligent caching with different TTLs:

| Data Type | Cache Key Pattern | TTL | Use Case |
|-----------|------------------|-----|----------|
| Latest Price | `price:latest:{symbol}` | 5 minutes | Real-time price display |
| Recent Data | `data:recent:{symbol}:{days}` | 1 hour | Charts and analysis |
| Symbol List | `symbols:list` | 6 hours | Available symbols |
| Full Data | `data:full:{symbol}` | Until update | Historical data |

## Cache Key Examples

```bash
price:latest:AAPL         # Latest price for Apple
data:recent:GOOGL:30      # Last 30 days of Google data
data:recent:MSFT:90       # Last 90 days of Microsoft data
symbols:list              # List of all available symbols
```

## Monitoring and Management

### Upstash Console Features

1. **Metrics**: View requests, bandwidth, and storage usage
2. **Data Browser**: Inspect cached keys and values
3. **CLI**: Built-in Redis CLI in the console
4. **Logs**: View recent commands (Pro feature)

### Usage Monitoring

Free tier limits:
- **Daily Requests**: 10,000
- **Bandwidth**: 1 GB
- **Max Storage**: 256 MB

Monitor your usage in the Upstash Console dashboard.

## Best Practices

1. **Use REST API Client**
   ```python
   from upstash_redis import Redis  # ✓ Correct
   # NOT: import redis  # ✗ Wrong - uses TCP connection
   ```

2. **Handle Cache Misses Gracefully**
   ```python
   cached_data = await cache.get(key)
   if not cached_data:
       # Fetch from GCS and cache
       data = await fetch_from_gcs(symbol)
       await cache.set(key, data, ttl=3600)
   ```

3. **Set Appropriate TTLs**
   - Shorter TTL for frequently changing data
   - Longer TTL for historical/static data
   - Always set TTL to prevent memory bloat

4. **Monitor Cache Hit Rate**
   ```python
   # Log cache hits/misses
   if cached_data:
       logger.info(f"Cache hit for {key}")
   else:
       logger.info(f"Cache miss for {key}")
   ```

## Troubleshooting

### Connection Errors

```
Error: Failed to connect to Redis
```
**Solution**: Verify `UPSTASH_REDIS_URL` and `UPSTASH_REDIS_TOKEN` are correct

### Authentication Failed

```
Error: Unauthorized
```
**Solution**: Ensure token is copied completely (it's very long!)

### Rate Limiting

```
Error: Rate limit exceeded
```
**Solution**: 
- Check daily usage in Upstash Console
- Implement local caching for high-frequency operations
- Consider upgrading to Pro plan

## Cost Optimization

Free tier is sufficient for most use cases:

| Metric | Free Tier | Typical Usage |
|--------|-----------|---------------|
| Requests | 10,000/day | ~2,000/day |
| Storage | 256 MB | ~10 MB |
| Bandwidth | 1 GB | ~50 MB |

To stay within limits:
1. Cache only essential data
2. Use appropriate TTLs
3. Implement request batching where possible
4. Monitor usage regularly

## Integration with Stock Data Service

The service automatically uses cache when enabled:

1. **API Response Flow**:
   ```
   Request → Check Cache → HIT: Return cached data
                       ↓
                      MISS → Fetch from GCS → Cache → Return
   ```

2. **Cache Invalidation**:
   - Automatic expiry based on TTL
   - Manual clearing when data is updated
   - Pattern-based clearing for bulk operations

## Environment-Specific Configuration

### Development
```bash
CACHE_ENABLED=true  # Enable for testing
LOG_LEVEL=DEBUG    # See cache operations
```

### Production
```bash
CACHE_ENABLED=true
LOG_LEVEL=INFO
```

### Testing
```bash
CACHE_ENABLED=false  # Disable for deterministic tests
```

## Next Steps

1. Set up monitoring alerts for cache usage
2. Implement cache warming for popular symbols
3. Add cache statistics endpoint
4. Configure cache preloading on startup