import { defineStore } from 'pinia'
import { ref } from 'vue'
import { AudioCapture } from '../utils/audioCapture'

interface Transcription {
  startLabel: string
  endLabel: string
  text: string
  speaker: number
}

export const useAudioStore = defineStore('audio', () => {
  const isMicActive = ref(false)
  const isSpeakerActive = ref(false)
  const status = ref('就绪')
  const transcriptions = ref<Transcription[]>([])
  
  let audioCapture: AudioCapture | null = null

  // 已移除虚拟音频设备检查逻辑，统一由 Tauri WASAPI 采集系统音频

  const startMicrophone = async () => {
    try {
      status.value = '正在启动麦克风...'
      audioCapture = new AudioCapture('mic')
      
      audioCapture.onTranscription = (text: string) => {
        const now = new Date()
        const start = new Date(now.getTime() - 3000)
        const format = (d: Date) => {
          const hh = String(d.getHours()).padStart(2, '0')
          const mm = String(d.getMinutes()).padStart(2, '0')
          const ss = String(d.getSeconds()).padStart(2, '0')
          return `${hh}:${mm}:${ss}`
        }
        transcriptions.value.push({
          startLabel: format(start),
          endLabel: format(now),
          text,
          speaker: 1
        })
      }
      
      audioCapture.onStatusChange = (newStatus: string) => {
        status.value = newStatus
      }
      
      await audioCapture.start()
      isMicActive.value = true
      status.value = '麦克风运行中'
    } catch (e) {
      status.value = '麦克风启动失败'
      console.error('麦克风启动错误:', e)
    }
  }

  const startSpeaker = async () => {
    if (isSpeakerActive.value) return
    try {
      status.value = '正在启动扬声器捕获...'
      audioCapture = new AudioCapture('speaker')
      audioCapture.onTranscription = (text: string) => {
        const now = new Date()
        const start = new Date(now.getTime() - 3000)
        const format = (d: Date) => {
          const hh = String(d.getHours()).padStart(2, '0')
          const mm = String(d.getMinutes()).padStart(2, '0')
          const ss = String(d.getSeconds()).padStart(2, '0')
          return `${hh}:${mm}:${ss}`
        }
        transcriptions.value.push({
          startLabel: format(start),
          endLabel: format(now),
          text,
          speaker: 2
        })
      }
      audioCapture.onStatusChange = (newStatus: string) => { status.value = newStatus }
      await audioCapture.start()
      isSpeakerActive.value = true
      status.value = '扬声器捕获运行中'
    } catch (error) {
      status.value = `扬声器捕获失败: ${error instanceof Error ? error.message : '未知错误'}`
      console.error('启动扬声器捕获失败:', error)
      isSpeakerActive.value = false
    }
  }

  const stopCapture = async () => {
    if (audioCapture) {
      try {
        status.value = '正在停止捕获...'
        await audioCapture.stop()
      } catch (e) {
        console.error('停止捕获错误:', e)
      }
      audioCapture = null
    }
    isMicActive.value = false
    isSpeakerActive.value = false
    status.value = '已停止'
  }

  const clearTranscriptions = () => {
    transcriptions.value = []
  }

  return {
    isMicActive,
    isSpeakerActive,
    status,
    transcriptions,
    startMicrophone,
    startSpeaker,
    stopCapture,
    clearTranscriptions
  }
})
