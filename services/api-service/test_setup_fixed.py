#!/usr/bin/env python3
"""Quick test to verify API service setup"""

import httpx
import asyncio

API_KEY = "dev-api-key"
BASE_URL = "http://localhost:8002"


async def test_api():
    # Configure client to follow redirects
    async with httpx.AsyncClient(follow_redirects=True) as client:
        # Test root endpoint
        print("Testing root endpoint...")
        response = await client.get(f"{BASE_URL}/")
        print(f"✓ Root: {response.status_code} - {response.json()}")
        
        # Test health endpoint
        print("\nTesting health endpoint...")
        response = await client.get(f"{BASE_URL}/health")
        print(f"✓ Health: {response.status_code} - {response.json()}")
        
        # Test authenticated endpoint
        print("\nTesting authenticated endpoint...")
        headers = {"X-API-Key": API_KEY}
        response = await client.get(f"{BASE_URL}/api/v1/health/ready", headers=headers)
        print(f"✓ Ready: {response.status_code} - {response.json()}")
        
        # Test strategies endpoint
        print("\nTesting strategies endpoint...")
        response = await client.get(f"{BASE_URL}/api/v1/strategies", headers=headers)
        strategies = response.json()
        print(f"✓ Strategies: {response.status_code} - Found {len(strategies)} strategies")
        print(f"  - {strategies[0]['name']}: {strategies[0]['description']}")
        
        # Test scan presets endpoint
        print("\nTesting scan presets endpoint...")
        response = await client.get(f"{BASE_URL}/api/v1/scan/presets", headers=headers)
        presets = response.json()
        print(f"✓ Scan Presets: {response.status_code} - Found {len(presets)} presets")
        print(f"  - {presets[0]['name']}: {presets[0]['description']}")
        
        # Test API docs endpoint
        print("\nTesting API documentation...")
        response = await client.get(f"{BASE_URL}/docs")
        print(f"✓ Swagger UI: {response.status_code} - Available at {BASE_URL}/docs")
        
        response = await client.get(f"{BASE_URL}/openapi.json")
        print(f"✓ OpenAPI Schema: {response.status_code} - Available")


if __name__ == "__main__":
    print("Testing API Service Setup\n" + "="*40 + "\n")
    asyncio.run(test_api())
    print("\n" + "="*40 + "\nAll tests completed successfully!")