export class AudioCapture {
  private ws: WebSocket | null = null
  private audioContext: AudioContext | null = null
  private stream: MediaStream | null = null
  private workletNode: AudioWorkletNode | null = null
  
  public onTranscription: ((text: string) => void) | null = null
  public onStatusChange: ((status: string) => void) | null = null

  constructor(private type: 'mic' | 'speaker') {}

  async start() {
    try {
      console.log('[音频捕获] 开始启动音频捕获...')
      this.ws = new WebSocket('ws://127.0.0.1:8765')
      
      this.ws.onopen = () => {
        console.log('[音频捕获] WebSocket连接已建立')
        this.onStatusChange?.('WebSocket 已连接')
        // 发送状态检查消息
        this.ws?.send('status')
      }
      
      this.ws.onmessage = (event) => {
        console.log('[音频捕获] 收到WebSocket消息:', event.data)
        const data = JSON.parse(event.data)
        if (data.type === 'transcription') {
          this.onTranscription?.(data.text)
        }
      }
      
      this.ws.onerror = (error) => {
        console.error('[音频捕获] WebSocket错误:', error)
        this.onStatusChange?.('WebSocket 错误')
      }

      this.ws.onclose = (event) => {
        console.log('[音频捕获] WebSocket连接关闭:', event.code, event.reason)
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

    // 如果是扬声器模式，优先尝试麦克风，如果没有则使用虚拟设备
    if (this.type === 'speaker') {
      try {
        this.onStatusChange?.('正在查找音频设备...')
        
        // 首先请求权限以获取设备标签
        await navigator.mediaDevices.getUserMedia({ audio: true })
        const devices = await navigator.mediaDevices.enumerateDevices()
        
        console.log('所有音频设备:', devices.map(d => ({ 
          kind: d.kind, 
          label: d.label, 
          deviceId: d.deviceId 
        })))
        
        // 优先使用第一个可用的音频输入设备（通常是麦克风）
        const audioInputDevices = devices.filter(d => d.kind === 'audioinput')
        
        if (audioInputDevices.length > 0) {
          // 检查是否是虚拟设备
          const isVirtualDevice = audioInputDevices[0].label.includes('CABLE') || 
                                 audioInputDevices[0].label.includes('VB-Audio') || 
                                 audioInputDevices[0].label.includes('Virtual') ||
                                 audioInputDevices[0].label.includes('VB-CABLE')
          
          if (isVirtualDevice) {
            this.onStatusChange?.(`使用虚拟音频设备: ${audioInputDevices[0].label || '未知设备'}`)
            console.log('使用虚拟设备:', audioInputDevices[0])
          } else {
            this.onStatusChange?.(`使用麦克风: ${audioInputDevices[0].label || '未知设备'}`)
            console.log('使用麦克风:', audioInputDevices[0])
          }
          
          constraints = {
            audio: {
              deviceId: audioInputDevices[0].deviceId,
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            }
          }
        } else {
          this.onStatusChange?.('未找到任何音频输入设备，请检查设备设置')
          console.warn('未找到任何音频输入设备')
          // 不抛出错误，继续使用默认约束
        }
      } catch (error) {
        this.onStatusChange?.('设备检测失败，使用默认音频设置')
        console.warn('设备检测错误，使用默认设置:', error)
        // 不抛出错误，继续使用默认约束
      }
    }

    this.onStatusChange?.('正在获取音频流...')
    console.log('[音频捕获] 开始获取音频流，约束:', constraints)
    this.stream = await navigator.mediaDevices.getUserMedia(constraints)
    console.log('[音频捕获] 音频流获取成功')
    
    this.audioContext = new AudioContext({ sampleRate: 16000 })
    console.log('[音频捕获] AudioContext创建成功，采样率:', this.audioContext.sampleRate)
    
    // 在Tauri环境中，使用import.meta.url来正确解析工作器路径
    const workletUrl = new URL('../worklets/pcm-processor.js', import.meta.url)
    console.log('[音频捕获] 加载音频工作器:', workletUrl.href)
    await this.audioContext.audioWorklet.addModule(workletUrl.href)
    console.log('[音频捕获] 音频工作器加载成功')
    
    const source = this.audioContext.createMediaStreamSource(this.stream)
    this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor')
    console.log('[音频捕获] 音频工作器节点创建成功')
    
    this.workletNode.port.onmessage = (event) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        console.log(`[音频捕获] 发送音频数据到服务器: ${event.data.byteLength} 字节`)
        this.ws.send(event.data)
      } else {
        console.warn(`[音频捕获] WebSocket未连接，状态: ${this.ws?.readyState}`)
      }
    }
    
    source.connect(this.workletNode)
    this.workletNode.connect(this.audioContext.destination)
    console.log('[音频捕获] 音频节点连接完成')
    
    this.onStatusChange?.('采集中...')
    console.log('[音频捕获] 音频捕获启动完成')
    } catch (error) {
      console.error('[音频捕获] 启动失败:', error)
      this.onStatusChange?.(`启动失败: ${error instanceof Error ? error.message : '未知错误'}`)
      throw error
    }
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