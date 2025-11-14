class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.buffer = new Float32Array(2048) // 使用Float32Array直接存储音频样本
    this.bufferIndex = 0
    this.minAudioLevel = 0.005 // 降低音频检测阈值
    this.lastSendTime = 0
    this.sendInterval = 200 // 发送间隔（毫秒）
    this.silentFrames = 0
    this.maxSilentFrames = 5 // 最大静默帧数
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]
    const currentTime = Date.now()
    
    if (input && input.length > 0) {
      const channelData = input[0]
      
      // 计算当前帧的能量
      let frameEnergy = 0
      for (let i = 0; i < channelData.length; i++) {
        frameEnergy += Math.abs(channelData[i])
      }
      frameEnergy /= channelData.length
      
      // 如果有音频能量，添加到缓冲区
      if (frameEnergy > this.minAudioLevel) {
        // 将当前帧数据添加到缓冲区
        for (let i = 0; i < channelData.length; i++) {
          if (this.bufferIndex < this.buffer.length) {
            this.buffer[this.bufferIndex++] = channelData[i]
          }
        }
        this.silentFrames = 0 // 重置静默帧数
      } else {
        this.silentFrames++ // 增加静默帧数
      }
      
      // 发送条件：缓冲区足够大 或者 检测到静默但缓冲区有数据
      if (this.bufferIndex >= 1024 || 
          (this.silentFrames >= this.maxSilentFrames && this.bufferIndex > 0)) {
        // 创建PCM数据
        const pcmData = new Int16Array(this.bufferIndex)
        for (let i = 0; i < this.bufferIndex; i++) {
          // 将[-1, 1]范围的浮点数转换为16位整数
          const sample = Math.max(-1, Math.min(1, this.buffer[i]))
          pcmData[i] = Math.floor(sample * 32767)
        }
        
        // 转换为Uint8Array用于传输
        const byteArray = new Uint8Array(pcmData.buffer)
        this.port.postMessage(byteArray.buffer, [byteArray.buffer])
        
        // 重置缓冲区
        this.bufferIndex = 0
        this.lastSendTime = currentTime
      }
    }
    
    return true
  }
}

registerProcessor('pcm-processor', PCMProcessor)