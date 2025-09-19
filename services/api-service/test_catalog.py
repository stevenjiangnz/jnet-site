#!/usr/bin/env python3
import sys

sys.path.insert(0, ".")

import asyncio

from app.api.v1.endpoints.stock import get_stock_catalog


async def test():
    try:
        result = await get_stock_catalog()
        print(f"Success: {result}")
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test())
