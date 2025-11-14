import sys
import io

# 设置标准输出编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
print("=== 最小诊断脚本 ===")
print("1. 基础环境设置完成")

# 逐个导入模块，查看哪个会触发Silero VAD缓存输出
print("\n2. 开始逐个测试模块导入...")

# 测试1: 导入torch
print("\n测试1: 导入torch模块")
try:
    print("开始导入torch...")
    import torch
    print("torch导入成功，版本:", torch.__version__)
except Exception as e:
    print("torch导入失败:", str(e))

# 测试2: 导入whisper
print("\n测试2: 导入whisper模块")
try:
    print("开始导入whisper...")
    import whisper
    print("whisper导入成功")
except Exception as e:
    print("whisper导入失败:", str(e))

# 测试3: 导入torchaudio
print("\n测试3: 导入torchaudio模块")
try:
    print("开始导入torchaudio...")
    import torchaudio
    print("torchaudio导入成功，版本:", torchaudio.__version__)
except Exception as e:
    print("torchaudio导入失败:", str(e))

# 测试4: 导入numpy
print("\n测试4: 导入numpy模块")
try:
    print("开始导入numpy...")
    import numpy as np
    print("numpy导入成功，版本:", np.__version__)
except Exception as e:
    print("numpy导入失败:", str(e))

# 测试5: 导入websockets
print("\n测试5: 导入websockets模块")
try:
    print("开始导入websockets...")
    import websockets
    print("websockets导入成功，版本:", websockets.__version__)
except Exception as e:
    print("websockets导入失败:", str(e))

# 测试6: 导入asyncio
print("\n测试6: 导入asyncio模块")
try:
    print("开始导入asyncio...")
    import asyncio
    print("asyncio导入成功")
except Exception as e:
    print("asyncio导入失败:", str(e))

print("\n=== 所有模块测试完成 ===")
print("请观察哪个导入语句触发了Silero VAD缓存信息输出")
