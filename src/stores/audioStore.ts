import { defineStore } from 'pinia'
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { AudioCapture } from '../utils/audioCapture'

interface Transcription {
  timestamp: string
  text: string
}

export const useAudioStore = defineStore('audio', () => {
  const isMicActive = ref(false)
  const isSpeakerActive = ref(false)
  const status = ref('就绪')
  const transcriptions = ref<Transcription[]>([])
  
  let audioCapture: AudioCapture | null = null

  const checkVirtualDevice = async (): Promise<boolean> => {
    try {
      status.value = '正在检查虚拟音频设备...'
      const result = await invoke<boolean>('has_virtual_device')
      status.value = result ? '虚拟音频设备已就绪' : '未检测到虚拟音频设备'
      return result
    } catch (e) {
      console.error('检查虚拟设备失败:', e)
      status.value = '检查设备失败'
      return false
    }
  }

  const startMicrophone = async () => {
    try {
      status.value = '正在启动麦克风...'
      audioCapture = new AudioCapture('mic')
      
      audioCapture.onTranscription = (text: string) => {
        transcriptions.value.push({
          timestamp: new Date().toLocaleTimeString(),
          text
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
      
      // 检查虚拟设备
      const hasDevice = await invoke<boolean>('has_virtual_device')
      console.log('虚拟设备检查结果:', hasDevice)
      
      if (!hasDevice) {
        console.warn('未找到虚拟音频设备，使用默认设备')
      }
      
      audioCapture = new AudioCapture('speaker')
      
      audioCapture.onTranscription = (text: string) => {
        transcriptions.value.push({
          timestamp: new Date().toLocaleTimeString(),
          text
        })
      }
      
      audioCapture.onStatusChange = (newStatus: string) => {
        status.value = newStatus
      }
      
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
    checkVirtualDevice,
    startMicrophone,
    startSpeaker,
    stopCapture,
    clearTranscriptions
  }
})