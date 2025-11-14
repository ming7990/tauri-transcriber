class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.buffer = new Float32Array(2048) // 使用Float32Array直接存储音频样本
    this.bufferIndex = 0
    this.minAudioLevel = 0.0001 // 极低的阈值，几乎任何声音都会被捕获
    this.lastSendTime = 0
    this.sendInterval = 200 // 发送间隔（毫秒）
    this.silentFrames = 0
    this.maxSilentFrames = 5 // 最大静默帧数
    this.frameCount = 0
    this.totalEnergy = 0
    this.maxEnergy = 0
    console.log('[PCM处理器] 初始化完成')
  }

  process(inputs, outputs, parameters) {
    this.frameCount++
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
      
      this.totalEnergy += frameEnergy
      this.maxEnergy = Math.max(this.maxEnergy, frameEnergy)
      
      // 每1000帧输出一次状态
      if (this.frameCount % 1000 === 0) {
        const avgEnergy = this.totalEnergy / this.frameCount
        console.log(`[PCM处理器] 运行状态 - 帧数: ${this.frameCount}, 缓冲区: ${this.bufferIndex}, 静默帧: ${this.silentFrames}`)
        console.log(`[PCM处理器] 音频能量 - 当前: ${frameEnergy.toFixed(6)}, 平均: ${avgEnergy.toFixed(6)}, 最大: ${this.maxEnergy.toFixed(6)}`)
      }
      
      // 总是添加到缓冲区（不管是否有声音），用于测试
      for (let i = 0; i < channelData.length; i++) {
        if (this.bufferIndex < this.buffer.length) {
          this.buffer[this.bufferIndex++] = channelData[i]
        }
      }
      
      // 如果有音频能量，重置静默帧数
      if (frameEnergy > this.minAudioLevel) {
        this.silentFrames = 0
      } else {
        this.silentFrames++
      }
      
      // 每1024样本发送一次数据（用于测试）
      if (this.bufferIndex >= 1024) {
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
        
        console.log(`[PCM处理器] 发送音频数据: ${this.bufferIndex} 样本, 能量: ${frameEnergy.toFixed(6)}`)
        
        // 重置缓冲区
        this.bufferIndex = 0
        this.lastSendTime = currentTime
      }
    } else {
      // 每5000帧输出一次无输入警告
      if (this.frameCount % 5000 === 0) {
        console.warn('[PCM处理器] 没有音频输入')
      }
    }
    
    return true
  }
}

registerProcessor('pcm-processor', PCMProcessor)