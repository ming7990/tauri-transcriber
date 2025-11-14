import asyncio
import websockets
import numpy as np

async def test_transcription():
    print("=== 音频转录测试脚本 ===")
    print("1. 连接到WebSocket服务器...")
    
    try:
        # 连接到后端WebSocket服务
        async with websockets.connect("ws://localhost:8765") as websocket:
            print("✅ 连接成功！")
            
            # 2. 发送状态检查命令
            print("\n2. 发送状态检查命令...")
            await websocket.send("status")
            
            # 接收状态响应
            status_response = await websocket.recv()
            print(f"✅ 收到状态响应: {status_response}")
            
            # 3. 生成测试音频数据（16kHz, 16位PCM格式）
            print("\n3. 生成测试音频数据...")
            
            # 生成一个简单的正弦波测试音频
            sample_rate = 16000  # 采样率
            duration = 2.0       # 时长2秒
            frequency = 440      # 440Hz音调（A4）
            volume = 0.5         # 音量
            
            # 生成时间数组
            t = np.linspace(0, duration, int(sample_rate * duration), False)
            
            # 生成正弦波
            sine_wave = np.sin(2 * np.pi * frequency * t) * volume
            
            # 转换为16位整数PCM格式
            pcm_data = np.int16(sine_wave * 32767)
            
            # 转换为字节数据
            audio_bytes = pcm_data.tobytes()
            
            print(f"✅ 生成音频数据成功，长度: {len(audio_bytes)}字节")
            print(f"   采样率: {sample_rate}Hz, 时长: {duration}秒, 频率: {frequency}Hz")
            
            # 4. 发送PCM数据进行转录
            print("\n4. 发送音频数据进行转录...")
            await websocket.send(audio_bytes)
            
            # 5. 接收转录结果
            transcription_result = await websocket.recv()
            print(f"\n✅ 转录测试完成！")
            print(f"转录结果: {transcription_result}")
            
            # 提示：由于我们使用的是生成的正弦波（没有实际语音），转录结果可能会是空白或噪声
            print("\n注意: 由于使用的是正弦波测试数据而非实际语音，转录结果可能为空或显示噪声")
            print("要测试真实语音转录，请修改脚本以读取实际语音文件或使用麦克风捕获真实语音数据")
            
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