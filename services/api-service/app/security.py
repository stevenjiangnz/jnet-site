from typing import Optional

from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader, APIKeyQuery

from app.config import settings

# Define security schemes
api_key_query = APIKeyQuery(name="api_key", auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def get_api_key(
    api_key_from_query: Optional[str] = Security(api_key_query),
    api_key_from_header: Optional[str] = Security(api_key_header),
) -> str:
    """Validate API key from query parameter or header."""
    # Check both sources
    api_key = api_key_from_query or api_key_from_header

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key missing",
        )

    if api_key != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    return api_key
