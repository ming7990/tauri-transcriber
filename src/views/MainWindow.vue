<template>
  <div class="app-container">
    <div class="content panel">
      <div class="header">
        <div class="controls no-drag">
          <button @click="toggleMic" :class="['btn', { active: audioStore.isMicActive }]">{{ audioStore.isMicActive ? '麦克风 · 开' : '麦克风 · 关' }}</button>
          <button @click="toggleSpeaker" :class="['btn', { active: audioStore.isSpeakerActive }]">{{ audioStore.isSpeakerActive ? '扬声器 · 开' : '扬声器 · 关' }}</button>
        </div>
      </div>

      <div class="transcription-area">
        <div v-if="audioStore.transcriptions.length === 0" class="placeholder">等待开始采集…</div>
        <div v-else class="transcription-list">
          <div v-for="(item, idx) in audioStore.transcriptions" :key="idx" class="transcription-item">
            <span class="timestamp">{{ item.timestamp }}</span>
            <span class="text">{{ item.text }}</span>
          </div>
        </div>
      </div>

      <div class="status-bar">
        <div class="live-indicator">
          <span class="dot" :class="{ active: isTranscribing }"></span>
          <span class="label">{{ isTranscribing ? `Transcribing · ${elapsedLabel}` : 'Idle' }}</span>
        </div>
        <button @click="clearTranscriptions" class="btn-clear no-drag">清空</button>
      </div>
    </div>

    
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { LogicalSize } from '@tauri-apps/api/dpi'

import { useTranscriptionTimer } from '../composables/useTranscriptionTimer'

const { audioStore, isTranscribing, elapsedLabel } = useTranscriptionTimer()
const activeTab = ref<'transcript' | 'summary'>('transcript')

onMounted(async () => {
  const win = getCurrentWindow()
  await win.setResizable(true)
  await win.setDecorations(false)
  await win.setAlwaysOnTop(false)
  await win.setSize(new LogicalSize(800, 600))

  if (typeof document !== 'undefined') {
    document.body.classList.remove('bubble-mode')
  }
})

const minimizeWindow = () => getCurrentWindow().minimize()
const closeWindow = () => getCurrentWindow().close()

const backToBubble = async () => {
  try {
    if (typeof window !== 'undefined') {
      window.location.hash = ''
    }
    const win = getCurrentWindow()
    await win.setResizable(false)
    await win.setDecorations(false)
    await win.setAlwaysOnTop(true)
    await win.setSize(new LogicalSize(48, 48))
    await win.setFocus()
  } catch {}
}

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
    await audioStore.startSpeaker()
  }
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
  padding: 12px;
  background: #0b0f19;
  color: #e5e7eb;
}



.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 16px;
}

.panel {
  background: #111826;
  border: 1px solid #1f2937;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.35);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tabs {
  display: flex;
  gap: 8px;
}

.tab {
  height: 30px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid #334155;
  background: transparent;
  color: #cbd5e1;
  font-weight: 600;
}

.tab.active {
  background: linear-gradient(0deg, #1f2937, #232b3a);
  color: #e5e7eb;
  border-color: #3b82f6;
  box-shadow: inset 0 -2px 0 #3b82f6;
}

.controls {
  display: flex;
  gap: 8px;
}

.top-config {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.btn {
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  background: #0f172a;
  border: 1px solid #334155;
  color: #cbd5e1;
}

.btn.active {
  background: #0b2e1a;
  border-color: #16a34a;
  color: #e7f5ed;
}

.transcription-area {
  flex: 1;
  background: #0d1320;
  border: 1px solid #1f2937;
  border-radius: 10px;
  padding: 16px;
  overflow-y: auto;
}

.summary-area {
  flex: 1;
  background: #0d1320;
  border: 1px solid #1f2937;
  border-radius: 10px;
  padding: 16px;
}

.placeholder {
  color: #9ca3af;
  text-align: center;
  margin-top: 24px;
}

.transcription-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.transcription-item {
  display: flex;
  gap: 12px;
  padding: 10px;
  background: linear-gradient(180deg, #121826, #0e1422);
  border: 1px solid #1f2937;
  border-radius: 8px;
}

.timestamp {
  color: #94a3b8;
  font-size: 12px;
  min-width: 80px;
}

.text {
  flex: 1;
  color: #e6e7ea;
  font-size: 14px;
  line-height: 1.6;
  letter-spacing: 0.2px;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #94a3b8;
}

.btn-clear {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 8px;
  background: #1f2937;
  color: #e5e7eb;
  border: 1px solid #334155;
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #94a3b8;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(156, 163, 175, 0.7);
}

.dot.active {
  background: #16a34a;
  box-shadow: 0 0 0 6px rgba(22, 163, 74, 0.25);
}
</style>


