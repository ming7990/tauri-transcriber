<template>
  <div class="app-container" :class="themeClass">
    <div class="content panel">
      <div class="header">
        <div class="controls no-drag">
          <button @click="toggleMic" :class="['btn', { active: audioStore.isMicActive }]">{{ audioStore.isMicActive ? '麦克风 · 开' : '麦克风 · 关' }}</button>
          <button @click="toggleSpeaker" :class="['btn', { active: audioStore.isSpeakerActive }]">{{ audioStore.isSpeakerActive ? '扬声器 · 开' : '扬声器 · 关' }}</button>
          <button class="theme-toggle" :class="theme" @click="toggleTheme">
            <svg class="icon sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
            <svg class="icon moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>
        </div>
      </div>

      <div class="transcription-area">
        <div v-if="audioStore.transcriptions.length === 0" class="placeholder">等待开始采集…</div>
        <div v-else class="transcription-list">
          <div v-for="(item, idx) in audioStore.transcriptions" :key="idx" class="transcription-item">
            <div class="label">
              <span class="icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="7" r="4"/>
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
                </svg>
              </span>
              <span class="speaker">{{ item.speaker }}</span>
              <span class="range">{{ item.startLabel }} - {{ item.endLabel }}</span>
            </div>
            <div class="text">{{ item.text }}</div>
          </div>
        </div>
      </div>

      
    </div>

    
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
 

import { useTranscriptionTimer } from '../composables/useTranscriptionTimer'

const { audioStore, isTranscribing, elapsedLabel } = useTranscriptionTimer()
const activeTab = ref<'transcript' | 'summary'>('transcript')
const theme = ref<'dark' | 'light'>('dark')
const themeClass = computed(() => theme.value === 'dark' ? 'theme-dark' : 'theme-light')

onMounted(async () => {
  if (typeof document !== 'undefined') {
    document.body.classList.remove('bubble-mode')
    const saved = localStorage.getItem('ui:theme')
    if (saved === 'light' || saved === 'dark') theme.value = saved as 'light' | 'dark'
  }
})

const minimizeWindow = () => {}
const closeWindow = () => {}

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

const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  try { localStorage.setItem('ui:theme', theme.value) } catch {}
}
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: var(--container-padding);
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', 'Helvetica Neue', Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.app-container.theme-dark { --bg: #000000; --text: #fafafa; --text-secondary: #a0a7b4; --label-bg: #1a1a1a; --label-border: #2a2a2a; --divider: #2a2a2a; --icon: #9ca3af; --chip-icon: #cbd5e1; --scrollbar: #1f2937; --window-shadow: none; --panel-radius: 0; --container-padding: 0; --window-dropshadow: none; --panel-outline: transparent; }
.app-container.theme-light { --bg: #ffffff; --text: #111827; --text-secondary: #6b7280; --label-bg: #ffffff; --label-border: #e6e7ea; --divider: #e5e7eb; --icon: #6b7280; --chip-icon: #9aa0a6; --scrollbar: #c7cdd4; --window-shadow: 0 16px 40px rgba(0,0,0,0.16), 0 2px 10px rgba(0,0,0,0.06); --panel-radius: 14px; --container-padding: 16px; --window-dropshadow: drop-shadow(0 14px 32px rgba(0,0,0,0.16)) drop-shadow(0 2px 12px rgba(0,0,0,0.08)); --panel-outline: #eceff1; }



.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 16px;
  min-height: 0;
}

.panel {
  background: var(--bg);
  border: 1px solid var(--panel-outline);
  border-radius: var(--panel-radius);
  box-shadow: var(--window-shadow);
  filter: var(--window-dropshadow);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg);
  border-bottom: 1px solid var(--divider);
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
  height: 28px;
  padding: 0 12px;
  border-radius: 14px;
  background: var(--label-bg);
  border: 1px solid var(--label-border);
  color: var(--text);
}

.btn.active {
  background: rgba(16,185,129,0.12);
  border-color: #10b981;
  color: #10b981;
}

.transcription-area {
  flex: 1;
  background: var(--bg);
  border: none;
  padding: 16px;
  overflow-y: auto;
  min-height: 0;
}

.transcription-area::-webkit-scrollbar {
  width: 8px;
}
.transcription-area::-webkit-scrollbar-track {
  background: rgba(3, 7, 18, 0.6);
}
.transcription-area::-webkit-scrollbar-thumb {
  background: var(--scrollbar);
  border-radius: 8px;
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
  gap: 16px;
}

.transcription-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
}

.label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--label-bg);
  border: 1px solid var(--label-border);
  border-radius: 9999px;
  padding: 2px 12px;
  color: var(--text-secondary);
}
.icon { display: inline-flex; }
.speaker { color: var(--text-secondary); font-size: 13px; }
.range { color: var(--text-secondary); font-size: 13px; }

.timestamp {
  color: #94a3b8;
  font-size: 12px;
}

.text {
  flex: 1;
  color: var(--text);
  font-size: 16px;
  font-weight: 500;
  line-height: 1.7;
  letter-spacing: 0.2px;
  word-break: break-word;
  margin-left: 10px;
}

.theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border-radius: 14px;
  background: var(--label-bg);
  border: 1px solid var(--label-border);
}
.theme-toggle .icon { color: var(--icon); }
.theme-dark .theme-toggle .sun { display: none; }
.theme-dark .theme-toggle .moon { display: inline-block; }
.theme-light .theme-toggle .sun { display: inline-block; }
.theme-light .theme-toggle .moon { display: none; }

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #94a3b8;
  padding: 10px 16px;
  border-top: 1px solid #1f2937;
}

.btn-clear {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 8px;
  background: #101827;
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


.label .icon { color: var(--chip-icon); }
