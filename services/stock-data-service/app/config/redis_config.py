import os
from dataclasses import dataclass, field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


@dataclass
class RedisConfig:
    upstash_redis_url: str = field(
        default_factory=lambda: os.getenv("UPSTASH_REDIS_URL", "")
    )
    upstash_redis_token: str = field(
        default_factory=lambda: os.getenv("UPSTASH_REDIS_TOKEN", "")
    )
    cache_enabled: bool = field(
        default_factory=lambda: os.getenv("CACHE_ENABLED", "false").lower() == "true"
    )

    # Cache TTL settings (in seconds)
    cache_ttl_latest_price: int = 300  # 5 minutes
    cache_ttl_recent_data: int = 3600  # 1 hour
    cache_ttl_symbol_list: int = 21600  # 6 hours
    cache_ttl_symbol_info: int = 3600  # 1 hour

    # Redis connection settings
    redis_socket_connect_timeout: int = 5
    redis_socket_keepalive: bool = True
    redis_decode_responses: bool = True
