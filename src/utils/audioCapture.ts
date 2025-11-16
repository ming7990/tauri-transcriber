export class AudioCapture {
  private ws: WebSocket | null = null
  private audioContext: AudioContext | null = null
  private stream: MediaStream | null = null
  private workletNode: AudioWorkletNode | null = null
  
  
  public onTranscription: ((text: string) => void) | null = null
  public onStatusChange: ((status: string) => void) | null = null

  constructor(private type: 'mic' | 'speaker' | 'system') {}

  // 已移除浏览器共享方案：系统音频改由 Tauri WASAPI 采集

  async start() {
    try {
      console.log('[音频捕获] 开始启动音频捕获...')
      this.ws = new WebSocket('ws://127.0.0.1:8765')
      
      this.ws.onopen = () => {
        console.log('[音频捕获] WebSocket连接已建立')
        this.onStatusChange?.('WebSocket 已连接')
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
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
    }

    if (this.type === 'speaker') {
      this.type = 'system'
      this.onStatusChange?.('系统音频采集中')
    }

    if (this.type === 'system') {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('start_system_capture')
      this.onStatusChange?.('系统音频采集中（Tauri）')
    } else if (!this.stream) {
      this.onStatusChange?.('正在获取音频流...')
      console.log('[音频捕获] 开始获取音频流，约束:', constraints)
      this.stream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log('[音频捕获] 音频流获取成功')
    }
    
    if (this.type !== 'system') {
      this.audioContext = new AudioContext({ sampleRate: 16000 })
      console.log('[音频捕获] AudioContext创建成功，采样率:', this.audioContext.sampleRate)
      const workletUrl = new URL('../worklets/pcm-processor.js', import.meta.url)
      console.log('[音频捕获] 加载音频工作器:', workletUrl.href)
      await this.audioContext.audioWorklet.addModule(workletUrl.href)
      console.log('[音频捕获] 音频工作器加载成功')
      const source = this.audioContext.createMediaStreamSource(this.stream as MediaStream)
      this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor')
      console.log('[音频捕获] 音频工作器节点创建成功')
      this.workletNode.port.onmessage = (event) => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          console.log(`[音频捕获] 发送音频数据到服务器: ${event.data.byteLength} 字节`)
          this.ws.send(event.data)
        }
      }
      source.connect(this.workletNode)
      this.workletNode.connect(this.audioContext.destination)
      console.log('[音频捕获] 音频节点连接完成')
    }
    
    this.onStatusChange?.('采集中...')
    console.log('[音频捕获] 音频捕获启动完成')
    } catch (error) {
      console.error('[音频捕获] 启动失败:', error)
      this.onStatusChange?.(`启动失败: ${error instanceof Error ? error.message : '未知错误'}`)
      throw error
    }
  }

  async stop() {
    if (this.type === 'system') {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('stop_system_capture')
    }
    this.workletNode?.disconnect()
    if (this.type !== 'system') {
      this.stream?.getTracks().forEach(track => track.stop())
    }
    await this.audioContext?.close()
    this.ws?.close()
    
    this.workletNode = null
    this.stream = null
    this.audioContext = null
    this.ws = null
  }
}
