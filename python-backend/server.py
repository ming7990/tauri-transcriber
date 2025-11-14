import sys
import io
import json
import numpy as np

# 禁用缓冲，确保日志立即输出
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', line_buffering=True)

print("=== 极简后端服务 ===")
sys.stdout.flush()

print("[1] 基础环境设置完成")
sys.stdout.flush()

# 只导入必要的基础模块
print("\n[2] 导入基础模块...")
sys.stdout.flush()

try:
    import time
    print("[2.1] time模块导入成功")
    sys.stdout.flush()
except Exception as e:
    print(f"[2.1] 模块导入失败: {e}")
    sys.stdout.flush()

# 现在尝试加载Whisper，但添加更多的输出和刷新
print("\n[3] 开始加载Whisper模型...")
sys.stdout.flush()

try:
    start_time = time.time()
    print("[3.1] 准备导入whisper模块...")
    sys.stdout.flush()
    
    import whisper
    print(f"[3.2] Whisper模块导入成功，版本: {whisper.__version__}")
    sys.stdout.flush()
    
    # 加载Whisper模型
    print("[3.3] 开始加载Whisper模型...")
    sys.stdout.flush()
    
    whisper_model = whisper.load_model("base")
    end_time = time.time()
    print(f"[3.4] Whisper模型加载成功，耗时: {end_time - start_time:.2f}秒")
    sys.stdout.flush()
    
    print("[3.5] Whisper模型测试完成")
    sys.stdout.flush()
except Exception as e:
    print(f"[3.5] Whisper模型加载失败: {e}")
    sys.stdout.flush()
    import traceback
    traceback.print_exc(file=sys.stdout)
    sys.stdout.flush()
    sys.exit(1)

# 延迟导入WebSocket相关模块
print("\n[4] 导入WebSocket相关模块...")
sys.stdout.flush()

try:
    print("[4.1] 准备导入asyncio模块...")
    sys.stdout.flush()
    
    import asyncio
    print("[4.2] asyncio模块导入成功")
    sys.stdout.flush()
    
    print("[4.3] 准备导入websockets模块...")
    sys.stdout.flush()
    
    import websockets
    print(f"[4.4] websockets模块导入成功，版本: {websockets.__version__}")
    sys.stdout.flush()
    
    # 全局状态
    vad_initialized = False
    vad_model = None
    last_transcript = ""
    last_transcript_time = 0
    transcript_threshold = 0.8  # 文本相似度阈值
    vad_threshold = 0.00001  # 降低VAD阈值，检测更微弱的声音
    
    # 简单的语音活动检测 (VAD)
    def is_speech_active(audio_data):
        """简单的能量检测，判断是否有语音活动"""
        # 计算音频的能量 (RMS)
        rms = np.sqrt(np.mean(audio_data.astype(np.float32)**2))
        # 增加调试信息，查看当前能量值和阈值
        print(f"[VAD调试] 当前音频RMS能量值: {rms}, 阈值: {vad_threshold}")
        # 提高能量阈值，减少噪声检测
        return rms > vad_threshold
    
    # 文本相似度计算 - 改进版
    def text_similarity(text1, text2):
        """计算两个文本的相似度，使用更准确的方法"""
        if not text1 or not text2:
            return 0.0
        
        # 清理文本，移除重复字符
        def clean_repeated_chars(text):
            # 移除连续重复的字符（超过3个）
            import re
            return re.sub(r'(.)\1{3,}', r'\1\1\1', text)
        
        # 清理文本
        clean1 = clean_repeated_chars(text1)
        clean2 = clean_repeated_chars(text2)
        
        # 计算Levenshtein距离（编辑距离）
        def levenshtein(s1, s2):
            if len(s1) < len(s2):
                return levenshtein(s2, s1)
            
            # len(s1) >= len(s2)
            if len(s2) == 0:
                return len(s1)
            
            previous_row = range(len(s2) + 1)
            for i, c1 in enumerate(s1):
                current_row = [i + 1]
                for j, c2 in enumerate(s2):
                    insertions = previous_row[j + 1] + 1
                    deletions = current_row[j] + 1
                    substitutions = previous_row[j] + (c1 != c2)
                    current_row.append(min(insertions, deletions, substitutions))
                previous_row = current_row
                
            return previous_row[-1]
        
        # 计算相似度（1 - 归一化编辑距离）
        distance = levenshtein(clean1, clean2)
        max_len = max(len(clean1), len(clean2))
        similarity = 1 - (distance / max_len) if max_len > 0 else 0
        
        print(f"[相似度计算] 原始文本1: '{text1}', 原始文本2: '{text2}'")
        print(f"[相似度计算] 清理后1: '{clean1}', 清理后2: '{clean2}', 相似度: {similarity:.4f}")
        
        return similarity
    
    # 音频处理和转录功能
    def transcribe_audio(pcm_data):
        """使用Whisper模型转录PCM音频数据，包含VAD和去重"""
        global last_transcript, last_transcript_time
        current_time = time.time()
        
        try:
            import numpy as np
            import torch
            
            # 将PCM数据转换为numpy数组
            # 假设PCM数据是16kHz采样率的单通道音频
            audio_data = np.frombuffer(pcm_data, dtype=np.int16)
            
            print(f"[音频处理] 收到PCM数据长度: {len(audio_data)}样本")
            
            # 检查数据是否有效（避免全零数据）
            if np.max(np.abs(audio_data)) == 0:
                print("[音频处理] 检测到全零数据，跳过转录")
                return ""
            
            # 转换为float32并归一化到[-1, 1]范围
            audio_data = audio_data.astype(np.float32) / 32768.0
            
            # 进行简单的语音活动检测
            if not is_speech_active(audio_data):
                print("[VAD] 检测到静默，跳过转录")
                return ""
            
            # 使用Whisper进行转录
            print("[转录] 开始使用Whisper模型转录...")
            result = whisper_model.transcribe(
                audio_data,
                language="zh",  # 设置为中文转录
                fp16=False,    # 在CPU上运行
                verbose=False,
                no_speech_threshold=0.6  # 增加无语音阈值，减少误判
            )
            
            current_transcript = result["text"].strip()
            
            print(f"[转录] 原始结果: '{current_transcript}'")
            
            # 如果当前转录内容为空，直接返回
            if not current_transcript:
                print("[转录] 结果为空，跳过")
                return ""
            
            # 如果距离上次有效转录超过5秒，认为是新内容
            if last_transcript and (current_time - last_transcript_time) > 5.0:
                print("[去重] 超过5秒没有新内容，重置转录历史")
                last_transcript = ""
            
            # 如果当前转录内容与上一次过于相似，则返回空字符串
            if last_transcript:
                similarity = text_similarity(current_transcript, last_transcript)
                if similarity > transcript_threshold:
                    print(f"[去重] 当前转录与上一次过于相似 (相似度: {similarity:.4f})，跳过")
                    return ""
            
            # 更新最后一次转录内容和时间
            last_transcript = current_transcript
            last_transcript_time = current_time
            
            print(f"[转录] 最终结果: '{current_transcript}'")
            return current_transcript
        except Exception as e:
            print(f"转录过程中出错: {e}")
            import traceback
            traceback.print_exc(file=sys.stdout)
            return ""
    
    async def handle_connection(websocket, path):
        print(f"[5] 客户端连接: {path}")
        sys.stdout.flush()
        global vad_initialized, vad_model
        
        try:
            while True:
                # 接收客户端消息
                message = await websocket.recv()
                print(f"[5.1] 收到消息类型: {type(message)}")
                sys.stdout.flush()
                
                # 处理不同类型的消息
                if isinstance(message, str):
                    # 文本命令处理
                    print(f"[5.1.1] 文本消息: {message}")
                    
                    if message == "status":
                        # 状态检查命令
                        status_response = {
                            "type": "status",
                            "data": {
                                "whisper_loaded": True,
                                "vad_initialized": vad_initialized,
                                "websocket_connected": True,
                                "version": "1.0.0"
                            }
                        }
                        await websocket.send(json.dumps(status_response))
                        print("[5.1.2] 发送状态响应")
                    else:
                        # 其他文本消息的回显
                        echo_response = {
                            "type": "echo",
                            "data": message
                        }
                        await websocket.send(json.dumps(echo_response))
                
                elif isinstance(message, bytes):
                    # 二进制PCM数据处理
                    print(f"[5.1.3] 收到PCM数据，长度: {len(message)}字节")
                    
                    # 执行音频转录
                    print("[5.1.4] 开始转录音频...")
                    transcription = transcribe_audio(message)
                    
                    # 只有当转录结果不为空时才发送
                    if transcription.strip():
                        transcript_response = {
                            "type": "transcription",
                            "text": transcription
                        }
                        await websocket.send(json.dumps(transcript_response))
                        print(f"[5.1.5] 转录完成: {transcription}")
                    else:
                        print("[5.1.5] 转录结果为空或被过滤，跳过发送")
                
                sys.stdout.flush()
                
        except websockets.exceptions.ConnectionClosed:
            print("[5.2] 客户端断开连接")
            sys.stdout.flush()
        except Exception as e:
            print(f"[5.3] 处理连接时出错: {e}")
            sys.stdout.flush()
            import traceback
            traceback.print_exc(file=sys.stdout)
            sys.stdout.flush()
    
    # 启动WebSocket服务器
    print("[4.5] 启动WebSocket服务器...")
    sys.stdout.flush()
    
    print("[4.6] 准备创建WebSocket服务...")
    sys.stdout.flush()
    
    start_server = websockets.serve(handle_connection, "localhost", 8765)
    print("[4.7] WebSocket服务对象创建成功")
    sys.stdout.flush()
    
    print("[4.8] 运行事件循环...")
    sys.stdout.flush()
    
    asyncio.get_event_loop().run_until_complete(start_server)
    print("[4.9] WebSocket服务器已启动，监听端口 8765")
    sys.stdout.flush()
    
    print("\n=== 服务启动完成 ===")
    sys.stdout.flush()
    
    # 保持服务运行
    asyncio.get_event_loop().run_forever()
    
except Exception as e:
    print(f"[4.9] WebSocket服务初始化失败: {e}")
    sys.stdout.flush()
    import traceback
    traceback.print_exc(file=sys.stdout)
    sys.stdout.flush()
    sys.exit(1)
