#!/usr/bin/env python3
"""Quick test to verify API service setup"""

import httpx
import asyncio

API_KEY = "dev-api-key"
BASE_URL = "http://localhost:8002"


async def test_api():
    async with httpx.AsyncClient() as client:
        # Test root endpoint
        print("Testing root endpoint...")
        response = await client.get(f"{BASE_URL}/")
        print(f"Root: {response.status_code} - {response.json()}")
        
        # Test health endpoint
        print("\nTesting health endpoint...")
        response = await client.get(f"{BASE_URL}/health")
        print(f"Health: {response.status_code} - {response.json()}")
        
        # Test authenticated endpoint
        print("\nTesting authenticated endpoint...")
        headers = {"X-API-Key": API_KEY}
        response = await client.get(f"{BASE_URL}/api/v1/health/ready", headers=headers)
        print(f"Ready: {response.status_code} - {response.json()}")
        
        # Test strategies endpoint (with trailing slash)
        print("\nTesting strategies endpoint...")
        response = await client.get(f"{BASE_URL}/api/v1/strategies/", headers=headers)
        print(f"Strategies: {response.status_code} - {response.json()[:2]}...")  # Show first 2 strategies
        
        # Test scan presets endpoint
        print("\nTesting scan presets endpoint...")
        response = await client.get(f"{BASE_URL}/api/v1/scan/presets/", headers=headers)
        print(f"Scan Presets: {response.status_code} - {response.json()[:1]}...")  # Show first preset


if __name__ == "__main__":
    print("Testing API Service Setup\n")
    asyncio.run(test_api())
    print("\nAll tests completed!")