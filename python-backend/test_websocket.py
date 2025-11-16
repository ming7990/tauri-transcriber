import asyncio
import websockets

async def test_websocket():
    print("=== WebSocket客户端测试 ===")
    print("尝试连接到后端服务...")
    
    try:
        # 连接到后端WebSocket服务
        async with websockets.connect("ws://localhost:8765") as websocket:
            print("✅ 连接成功！")
            
            # 发送启动回环采集指令
            test_message = "start_speaker"
            print(f"发送测试消息: {test_message}")
            await websocket.send(test_message)
            
            # 接收响应
            response = await websocket.recv()
            print(f"接收到响应: {response}")
            
            print("\n✅ WebSocket通信测试完成")
            
    except Exception as e:
        print(f"❌ 连接或通信失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_websocket())
