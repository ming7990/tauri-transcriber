export class AudioCapture {
  private ws: WebSocket | null = null
  private audioContext: AudioContext | null = null
  private stream: MediaStream | null = null
  private workletNode: AudioWorkletNode | null = null
  
  public onTranscription: ((text: string) => void) | null = null
  public onStatusChange: ((status: string) => void) | null = null

  constructor(private type: 'mic' | 'speaker') {}

  async start() {
    this.ws = new WebSocket('ws://127.0.0.1:8765')
    
    this.ws.onopen = () => {
      this.onStatusChange?.('WebSocket 已连接')
    }
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'transcription') {
        this.onTranscription?.(data.text)
      }
    }
    
    this.ws.onerror = () => {
      this.onStatusChange?.('WebSocket 错误')
    }

    // 基础约束配置
    let constraints: MediaStreamConstraints = {
      audio: this.type === 'speaker' 
        ? { 
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          }
        : {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
    }

    // 如果是扬声器模式，尝试查找并使用 VB-CABLE 设备
    if (this.type === 'speaker') {
      try {
        this.onStatusChange?.('正在查找虚拟音频设备...')
        const devices = await navigator.mediaDevices.enumerateDevices()
        const cableDevice = devices.find(device => 
          device.kind === 'audioinput' && device.label.includes('CABLE')
        )
        
        if (cableDevice) {
          this.onStatusChange?.(`找到虚拟音频设备: ${cableDevice.label}`)
          // 使用特定的设备 ID
          constraints = {
            audio: {
              deviceId: cableDevice.deviceId,
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            }
          }
        } else {
          throw new Error('未找到 VB-CABLE 虚拟音频设备。请安装 VB-CABLE 或类似的虚拟音频设备。')
        }
      } catch (error) {
        this.onStatusChange?.('扬声器捕获失败：需要虚拟音频设备')
        throw error
      }
    }

    this.onStatusChange?.('正在获取音频流...')
    this.stream = await navigator.mediaDevices.getUserMedia(constraints)
    
    this.audioContext = new AudioContext({ sampleRate: 16000 })
    
    // 在Tauri环境中，使用import.meta.url来正确解析工作器路径
    const workletUrl = new URL('../worklets/pcm-processor.js', import.meta.url)
    await this.audioContext.audioWorklet.addModule(workletUrl.href)
    
    const source = this.audioContext.createMediaStreamSource(this.stream)
    this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor')
    
    this.workletNode.port.onmessage = (event) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(event.data)
      }
    }
    
    source.connect(this.workletNode)
    this.workletNode.connect(this.audioContext.destination)
    
    this.onStatusChange?.('采集中...')
  }

  async stop() {
    this.workletNode?.disconnect()
    this.stream?.getTracks().forEach(track => track.stop())
    await this.audioContext?.close()
    this.ws?.close()
    
    this.workletNode = null
    this.stream = null
    this.audioContext = null
    this.ws = null
  }
}