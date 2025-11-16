// 音频工作单元：在 AudioWorklet 中对输入流做缓冲、能量检测与 PCM 转换
// 设计要点：
// - 支持 2/4/6 秒的可变分段长度，轮询发送，提升语音段完整性
// - 使用简单能量阈值做静音过滤，减少不必要的传输与计算
// - 将 float32 归一化样本转换为 int16 PCM，通过 port 发送到主线程
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    // 可选的分段时长（秒），轮询用于平衡响应速度与上下文完整性
    this.durations = [2, 4, 6]
    this.durationIndex = 0
    // 采样率：默认使用 AudioWorklet 的 sampleRate，若不可用则回退到 16kHz
    this.sampleRate = sampleRate || 16000
    // 当前分段目标采样数：sampleRate * 当前时长
    this.targetSamples = Math.floor(this.sampleRate * this.durations[this.durationIndex])
    // 最大缓冲为 6 秒的 float32 样本
    this.chunkBuffer = new Float32Array(this.sampleRate * 6)
    this.chunkIndex = 0
    // 能量阈值：低于该值视为静音，跳过发送
    this.minAudioLevel = 0.0001
    // 运行指标：帧数、平均/最大能量，便于调试与观察
    this.frameCount = 0
    this.totalEnergy = 0
    this.maxEnergy = 0
    console.log('[PCM处理器] 初始化完成')
  }

  process(inputs, outputs, parameters) {
    this.frameCount++
    const input = inputs[0]
    
    if (input && input.length > 0) {
      const channelData = input[0]
      // 计算当前帧能量（绝对值平均），用于动态观察音量水平
      let frameEnergy = 0
      for (let i = 0; i < channelData.length; i++) {
        frameEnergy += Math.abs(channelData[i])
      }
      frameEnergy /= channelData.length
      
      this.totalEnergy += frameEnergy
      this.maxEnergy = Math.max(this.maxEnergy, frameEnergy)
      
      // 每 1000 帧输出一次运行状态：帧计数、缓冲进度、能量统计
      if (this.frameCount % 1000 === 0) {
        const avgEnergy = this.totalEnergy / this.frameCount
        console.log(`[PCM处理器] 运行状态 - 帧数: ${this.frameCount}, 缓冲样本: ${this.chunkIndex}`)
        console.log(`[PCM处理器] 音频能量 - 当前: ${frameEnergy.toFixed(6)}, 平均: ${avgEnergy.toFixed(6)}, 最大: ${this.maxEnergy.toFixed(6)}`)
      }
      
      // 将本帧样本写入缓冲，直至达到当前目标分段长度
      for (let i = 0; i < channelData.length; i++) {
        if (this.chunkIndex < this.chunkBuffer.length) {
          this.chunkBuffer[this.chunkIndex++] = channelData[i]
        }
      }

      if (this.chunkIndex >= this.targetSamples) {
        // 分段能量评估：用于静音过滤
        let energy = 0
        for (let i = 0; i < this.targetSamples; i++) {
          energy += Math.abs(this.chunkBuffer[i])
        }
        energy /= this.targetSamples

        if (energy > this.minAudioLevel) {
          // float32 → int16 PCM：截断到 [-1,1] 后线性量化到 [-32768,32767]
          const pcmData = new Int16Array(this.targetSamples)
          for (let i = 0; i < this.targetSamples; i++) {
            const sample = Math.max(-1, Math.min(1, this.chunkBuffer[i]))
            pcmData[i] = Math.floor(sample * 32767)
          }
          const byteArray = new Uint8Array(pcmData.buffer)
          // 通过消息端口传回主线程，便于后续传输至后端识别服务
          this.port.postMessage(byteArray.buffer, [byteArray.buffer])
          console.log(`[PCM处理器] 发送音频数据: ${this.targetSamples} 样本, 能量: ${energy.toFixed(6)}，时长: ${this.durations[this.durationIndex]}s`)
        } else {
          console.log(`[PCM处理器] 静音跳过: ${this.targetSamples} 样本，时长: ${this.durations[this.durationIndex]}s`)
        }

        // 重置缓冲并切换下一个轮询时长（2/4/6 秒）
        this.chunkIndex = 0
        this.durationIndex = (this.durationIndex + 1) % this.durations.length
        this.targetSamples = Math.floor(this.sampleRate * this.durations[this.durationIndex])
      }
    } else {
      // 无输入帧的告警（每 5000 帧一次），方便定位音频管线问题
      if (this.frameCount % 5000 === 0) {
        console.warn('[PCM处理器] 没有音频输入')
      }
    }
    
    return true
  }
}

registerProcessor('pcm-processor', PCMProcessor)
