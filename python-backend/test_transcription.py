import asyncio
import websockets
import numpy as np

async def test_transcription():
    print("=== 音频转录测试脚本 ===")
    print("1. 连接到WebSocket服务器...")
    
    try:
        async with websockets.connect("ws://localhost:8765") as websocket:
            print("✅ 连接成功！")

            print("\n2. 发送状态检查命令...")
            await websocket.send("status")
            status_response = await websocket.recv()
            print(f"✅ 收到状态响应: {status_response}")

            print("\n3. 生成并发送不同时长音频数据...")
            sample_rate = 16000
            frequency = 440
            volume = 0.5
            durations = [2.0, 4.0, 6.0]

            for d in durations:
                t = np.linspace(0, d, int(sample_rate * d), False)
                sine_wave = np.sin(2 * np.pi * frequency * t) * volume
                pcm_data = np.int16(sine_wave * 32767)
                audio_bytes = pcm_data.tobytes()

                print(f"\n➡️ 发送音频: 时长 {d}s, 字节 {len(audio_bytes)}")
                await websocket.send(audio_bytes)
                try:
                    transcription_result = await asyncio.wait_for(websocket.recv(), timeout=10)
                    print(f"收到转录: {transcription_result}")
                except Exception as e:
                    print(f"等待转录超时或失败: {e}")

            print("\n提示: 正弦波非语音，转录可能为空或噪声")
            
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n=== 测试结束 ===")

if __name__ == "__main__":
    # 确保依赖已安装
    print("检查依赖...")
    try:
        import numpy as np
        print("✅ numpy已安装")
    except ImportError:
        print("❌ numpy未安装，请运行: pip install numpy")
        exit(1)
    
    print("开始测试...")
    asyncio.run(test_transcription())
