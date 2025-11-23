import asyncio
from playwright.async_api import async_playwright

async def main():
    try:
        print("Starting Playwright...")
        p = await async_playwright().start()
        print("Playwright started successfully.")
        await p.stop()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())