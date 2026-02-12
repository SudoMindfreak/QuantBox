#!/usr/bin/env python3
"""
Quick test of Polymarket WebSocket endpoint
"""
import json
import asyncio
import websockets

async def test_polymarket_ws():
    print("🔌 Testing Polymarket WebSocket endpoint...")
    print("URL: wss://ws-subscriptions-clob.polymarket.com/ws")
    
    try:
        async with websockets.connect("wss://ws-subscriptions-clob.polymarket.com/ws") as ws:
            print("✅ Connected successfully!")
            
            # Try to subscribe to a known active asset
            test_asset_id = "71321045679252212594626385532706912750332728571942532289631379312455583992563"
            
            subscription_msg = json.dumps({
                "type": "market",
                "assets_ids": [test_asset_id],
                "initial_dump": True
            })
            
            print(f"\n📤 Sending subscription: {subscription_msg}")
            await ws.send(subscription_msg)
            
            print("\n📥 Waiting for response (10s timeout)...")
            response = await asyncio.wait_for(ws.recv(), timeout=10)
            
            print(f"✅ Received: {response[:200]}...")
            print("\n🎉 WebSocket is working!")
            
    except websockets.exceptions.InvalidStatusCode as e:
        print(f"\n❌ Connection failed with status code: {e.status_code}")
        print(f"Headers: {e.headers}")
    except asyncio.TimeoutError:
        print("\n⚠️  Connected but no response (timeout)")
    except Exception as e:
        print(f"\n❌ Error: {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(test_polymarket_ws())
