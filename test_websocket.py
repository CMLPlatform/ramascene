#!/usr/bin/env python3
import asyncio
import websockets
import sys

async def test_websocket():
    uri = "ws://127.0.0.1:8001/ramascene/"
    try:
        async with websockets.connect(uri) as websocket:
            print(f"✅ WebSocket connection to {uri} SUCCESSFUL")
            # Try to send a test message
            await websocket.send('{"action": "default"}')
            response = await websocket.recv()
            print(f"✅ Received response: {response[:100]}...")
            await websocket.close()
            return True
    except Exception as e:
        print(f"❌ WebSocket connection FAILED: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_websocket())
    sys.exit(0 if success else 1)
