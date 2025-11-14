<template>
  <div class="app-container">
    <div class="titlebar draggable">
      <div class="title">🎙️ 实时转录</div>
      <div class="window-controls no-drag">
        <button @click="minimizeWindow" class="control-btn">−</button>
        <button @click="closeWindow" class="control-btn">×</button>
      </div>
    </div>

    <div class="content glass">
      <div class="device-selector">
        <button 
          @click="toggleMic" 
          :class="['btn', { active: audioStore.isMicActive }]"
          class="no-drag"
        >
          {{ audioStore.isMicActive ? '🔴 停止麦克风' : '🎤 麦克风' }}
        </button>
        <button 
          @click="toggleSpeaker" 
          :class="['btn', { active: audioStore.isSpeakerActive }]"
          class="no-drag"
        >
          {{ audioStore.isSpeakerActive ? '🔴 停止扬声器' : '🔊 扬声器' }}
        </button>
      </div>

      <div class="transcription-area">
        <div v-if="audioStore.transcriptions.length === 0" class="placeholder">
          点击上方按钮开始转录...
        </div>
        <div v-else class="transcription-list">
          <div 
            v-for="(item, idx) in audioStore.transcriptions" 
            :key="idx" 
            class="transcription-item"
          >
            <span class="timestamp">{{ item.timestamp }}</span>
            <span class="text">{{ item.text }}</span>
          </div>
        </div>
      </div>

      <div class="status-bar">
        <span class="status">{{ audioStore.status }}</span>
        <button @click="clearTranscriptions" class="btn-clear no-drag">清空</button>
      </div>
    </div>

    <VirtualDeviceWizard 
      v-if="showWizard" 
      @close="showWizard = false"
      @installed="onVirtualDeviceInstalled"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useAudioStore } from './stores/audioStore'
import VirtualDeviceWizard from './components/VirtualDeviceWizard.vue'

const audioStore = useAudioStore()
const showWizard = ref(false)

const minimizeWindow = () => getCurrentWindow().minimize()
const closeWindow = () => getCurrentWindow().close()

const toggleMic = async () => {
  if (audioStore.isMicActive) {
    await audioStore.stopCapture()
  } else {
    await audioStore.startMicrophone()
  }
}

const toggleSpeaker = async () => {
  if (audioStore.isSpeakerActive) {
    await audioStore.stopCapture()
  } else {
    const hasDevice = await audioStore.checkVirtualDevice()
    if (!hasDevice) {
      showWizard.value = true
    } else {
      await audioStore.startSpeaker()
    }
  }
}

const onVirtualDeviceInstalled = async () => {
  showWizard.value = false
  await audioStore.startSpeaker()
}

const clearTranscriptions = () => {
  audioStore.clearTranscriptions()
}
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 8px;
}

.titlebar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  margin-bottom: 8px;
}

.title {
  font-size: 13px;
  font-weight: 600;
}

.window-controls {
  display: flex;
  gap: 8px;
}

.control-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: var(--glass-bg);
  color: var(--text-primary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  transition: all 0.2s;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 16px;
}

.device-selector {
  display: flex;
  gap: 12px;
}

.transcription-area {
  flex: 1;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 16px;
  overflow-y: auto;
}

.placeholder {
  color: var(--text-secondary);
  text-align: center;
  margin-top: 40px;
}

.transcription-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.transcription-item {
  display: flex;
  gap: 12px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
}

.timestamp {
  color: var(--text-secondary);
  font-size: 12px;
  min-width: 60px;
}

.text {
  flex: 1;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--text-secondary);
}

.btn-clear {
  padding: 6px 12px;
  font-size: 12px;
}
</style>