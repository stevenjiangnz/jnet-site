"""Supabase database client configuration."""

import os
from typing import Optional

from supabase import Client, create_client

_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """Get or create a Supabase client instance."""
    global _supabase_client

    if _supabase_client is None:
        # Get Supabase credentials from environment
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not supabase_key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables"
            )

        _supabase_client = create_client(supabase_url, supabase_key)

    return _supabase_client
