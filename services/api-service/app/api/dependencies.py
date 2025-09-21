from typing import Any, Dict, Optional

from fastapi import Header, HTTPException


async def get_current_user(x_user_email: str = Header(None)) -> Dict[str, Any]:
    """Get current user from X-User-Email header."""
    if not x_user_email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"email": x_user_email}


async def get_current_user_optional(
    x_user_email: Optional[str] = Header(None),
) -> Optional[Dict[str, Any]]:
    """Get current user from X-User-Email header (optional)."""
    if x_user_email:
        return {"email": x_user_email}
    return None
