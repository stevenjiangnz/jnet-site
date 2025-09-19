import asyncio
import httpx


async def test_endpoints():
    print("Testing stock-data-service directly...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:9000/api/v1/catalog")
            print(f"Direct call status: {response.status_code}")
            if response.status_code == 200:
                print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

    print("\nTesting api-service...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:8002/api/v1/stock/catalog")
            print(f"API service call status: {response.status_code}")
            if response.status_code == 200:
                print(f"Response: {response.json()}")
            else:
                print(f"Error response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(test_endpoints())
