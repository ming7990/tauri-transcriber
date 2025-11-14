import sys
import io
import time

# 设置标准输出编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
print("=== Silero VAD 诊断脚本 ===")

# 导入基础模块
print("1. 导入基础模块...")
try:
    import torch
    print("   torch导入成功，版本:", torch.__version__)
except Exception as e:
    print("   torch导入失败:", str(e))

try:
    import numpy as np
    print("   numpy导入成功，版本:", np.__version__)
except Exception as e:
    print("   numpy导入失败:", str(e))

# 测试Silero VAD相关导入
print("\n2. 开始测试Silero VAD相关导入...")

# 测试1: 直接从torch.hub导入Silero VAD
try:
    print("\n测试1: 尝试从torch.hub导入Silero VAD")
    print("   开始导入...")
    start_time = time.time()
    
    # 注意：这里我们只导入函数，不实际加载模型
    vad_model = torch.hub.load(
        repo_or_dir='snakers4/silero-vad',
        model='silero_vad',
        force_reload=False,
        onnx=False
    )
    
    end_time = time.time()
    print(f"   Silero VAD模型加载耗时: {end_time - start_time:.2f}秒")
    print("   Silero VAD模型加载成功")
    
    # 测试模型功能
    print("   测试模型功能...")
    sample_rate = 16000
    test_audio = torch.zeros(16000)  # 1秒的静音音频
    vad_prob = vad_model(test_audio, sample_rate)
    print(f"   模型推理成功，输出: {vad_prob}")
    
    # 测试其他可能的功能
    print("   测试VAD工具函数...")
    
    # 尝试获取其他工具函数
    try:
        get_speech_timestamps = torch.hub.load(
            repo_or_dir='snakers4/silero-vad',
            model='get_speech_timestamps',
            force_reload=False
        )
        print("   get_speech_timestamps函数获取成功")
    except Exception as e:
        print(f"   获取get_speech_timestamps失败: {str(e)}")
        
    try:
        save_audio = torch.hub.load(
            repo_or_dir='snakers4/silero-vad',
            model='save_audio',
            force_reload=False
        )
        print("   save_audio函数获取成功")
    except Exception as e:
        print(f"   获取save_audio失败: {str(e)}")
        
    try:
        read_audio = torch.hub.load(
            repo_or_dir='snakers4/silero-vad',
            model='read_audio',
            force_reload=False
        )
        print("   read_audio函数获取成功")
    except Exception as e:
        print(f"   获取read_audio失败: {str(e)}")
        
    try:
        VADIterator = torch.hub.load(
            repo_or_dir='snakers4/silero-vad',
            model='VADIterator',
            force_reload=False
        )
        print("   VADIterator类获取成功")
    except Exception as e:
        print(f"   获取VADIterator失败: {str(e)}")
        
    print("   Silero VAD功能测试完成")
    
except Exception as e:
    print(f"   Silero VAD导入或初始化失败: {str(e)}")
    import traceback
    traceback.print_exc()

print("\n=== Silero VAD诊断完成 ===")
print("请分析是否存在卡住或异常情况")
