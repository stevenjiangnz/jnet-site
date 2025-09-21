"""Supabase database client configuration."""

from typing import Optional

from supabase import Client, create_client

from app.config import settings

_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """Get or create a Supabase client instance."""
    global _supabase_client

    if _supabase_client is None:
        # Get Supabase credentials from settings
        supabase_url = settings.supabase_url
        supabase_key = settings.supabase_service_role_key

        if not supabase_url or not supabase_key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables"
            )

        _supabase_client = create_client(supabase_url, supabase_key)

    return _supabase_client
