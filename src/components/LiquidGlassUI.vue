<template>
  <!-- 简洁优雅的液态玻璃 - 精确匹配图二效果 -->
  <!-- 顶部玻璃胶囊栏 -->
  <div class="glass-capsule">
    <div class="capsule-segment" @click="toggleListening" :class="{ active: isListening }">
      <span class="segment-label">聆听</span>
      <svg class="segment-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="4" y="8" width="3" height="8" rx="1"/>
        <rect x="9" y="5" width="3" height="14" rx="1"/>
        <rect x="14" y="8" width="3" height="8" rx="1"/>
        <rect x="19" y="11" width="3" height="2" rx="1"/>
      </svg>
    </div>
    
    <div class="capsule-divider"></div>
    
    <div class="capsule-segment" @click="handleAsk">
      <span class="segment-label">提问</span>
    </div>
    
    <div class="capsule-divider"></div>
    
    <div class="capsule-segment" @click="toggleShowHide">
      <span class="segment-label">{{ isVisible ? '隐藏' : '显示' }}</span>
      <span class="shortcut">⌘</span>
      <span class="shortcut-key">\</span>
    </div>
    
    <div class="capsule-divider"></div>
    
    <div class="capsule-segment menu-segment" @click="handleMoreOptions">
      <svg class="segment-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="5" r="1"/>
        <circle cx="12" cy="12" r="1"/>
        <circle cx="12" cy="19" r="1"/>
      </svg>
    </div>
  </div>

  <!-- 主玻璃卡片 -->
  <div class="glass-card">
    <div class="card-header">
      <span class="card-title">实时洞察</span>
      <div class="card-actions">
        <button class="action-pill" @click="toggleTranscript">
          <span class="pill-text">显示转录</span>
        </button>
        <button class="action-icon" @click="handleAudioWave">
          <svg class="icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"/>
          </svg>
        </button>
        <button class="action-icon" @click="handleCopy">
          <svg class="icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
      </div>
    </div>
    
    <div class="card-content">
      <h2 class="content-heading">{{ audioStore.transcriptions.length > 0 ? '实时转录' : '开始聆听' }}</h2>
      <div class="content-area" v-if="audioStore.transcriptions.length > 0">
        <div v-for="(item, idx) in audioStore.transcriptions.slice(-3)" :key="idx" class="transcription-item">
          <span class="item-number">{{ idx + 1 }}.</span>
          <span class="item-text">{{ item.text }}</span>
        </div>
      </div>
      <div class="placeholder-panel" v-else>
        <p class="placeholder-text">点击“聆听”开始转写音频…</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useTranscriptionTimer } from '../composables/useTranscriptionTimer'

const { audioStore, isTranscribing, elapsedLabel } = useTranscriptionTimer()

const isListening = ref(false)
const isVisible = ref(true)

const toggleListening = async () => {
  isListening.value = !isListening.value
  if (isListening.value) {
    await audioStore.startMicrophone()
  } else {
    await audioStore.stopCapture()
  }
}

const handleAsk = () => {
  console.log('Ask button clicked')
}

const toggleShowHide = () => {
  isVisible.value = !isVisible.value
}

const handleMoreOptions = () => {
  console.log('More options clicked')
}

const toggleTranscript = () => {
  console.log('Toggle transcript')
}

const handleAudioWave = () => {
  console.log('Audio wave clicked')
}

const handleCopy = () => {
  const content = document.querySelector('.content-area')?.textContent || document.querySelector('.placeholder-panel')?.textContent
  if (content) {
    navigator.clipboard.writeText(content)
    console.log('Content copied to clipboard')
  }
}
</script>

<style scoped>
/* 简洁优雅的液态玻璃效果 - 精确匹配图二 */

/* 顶部玻璃胶囊 - 图二风格高级玻璃效果 */
.glass-capsule {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  backdrop-filter: blur(30px) saturate(200%);
  -webkit-backdrop-filter: blur(30px) saturate(200%);
  background:
    linear-gradient(180deg, rgba(39, 39, 39, 0.8), rgba(39, 39, 39, 0.8));
  border: 1px solid transparent;
  border-image: linear-gradient(90deg, #19D3FF, #0A6BFF) 1;
  border-radius: 9999px;
  padding: 6px 8px;
  box-shadow:
    0 0 8px rgba(0, 0, 0, 0.5),
    inset 0 0 0 rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  max-width: 95vw;
  overflow: visible;
  z-index: 1000;
}

/* 玻璃边缘高光 - 图二风格柔和高光 */
.glass-capsule::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.18) 0%,
    rgba(255, 255, 255, 0.08) 30%,
    transparent 60%,
    rgba(255, 255, 255, 0.12) 100%
  );
  pointer-events: none;
  mix-blend-mode: overlay;
}

.capsule-segment {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
  position: relative;
  z-index: 2;
}

.capsule-segment:hover {
  background: rgba(255, 255, 255, 0.15);
}

.capsule-segment.active {
  background: rgba(255, 255, 255, 0.25);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.segment-label {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  white-space: nowrap;
  letter-spacing: 0.2px;
  text-shadow: 0 1px 1px var(--fg-outline);
}

.segment-icon {
  stroke: #ffffff;
  fill: none;
  width: 12px;
  height: 12px;
  opacity: 0.9;
  paint-order: stroke fill;
  stroke-linejoin: round;
  filter: drop-shadow(0 1px 1px var(--fg-outline));
}

.shortcut,
.shortcut-key {
  font-size: 10px;
  font-weight: 600;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 4px;
  border-radius: 3px;
  margin-left: 4px;
  font-family: 'SF Mono', Monaco, monospace;
}

.capsule-divider {
  width: 1px;
  height: 16px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 2px;
}

.menu-segment {
  padding: 8px 12px;
}

/* 主玻璃卡片 - 高级玻璃效果 */
.glass-card {
  position: fixed;
  top: 88px;
  left: 50%;
  transform: translateX(-50%);
  backdrop-filter: blur(35px) saturate(220%);
  -webkit-backdrop-filter: blur(35px) saturate(220%);
  background:
    linear-gradient(180deg, rgba(39, 39, 39, 0.88), rgba(39, 39, 39, 0.88));
  border: 1px solid transparent;
  border-image: linear-gradient(120deg, #19D3FF, #0A6BFF) 1;
  border-radius: 24px;
  padding: 32px;
  box-shadow:
    0 1px 12px rgba(0, 0, 0, 0.5),
    inset 0 0 0 rgba(255, 255, 255, 0.6);
  width: 380px;
  max-width: 90vw;
  z-index: 999;
}

/* 卡片玻璃边缘高光 - 图二风格柔和高光 */
.glass-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.22) 0%,
    rgba(255, 255, 255, 0.10) 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.08) 75%,
    rgba(255, 255, 255, 0.16) 100%
  );
  pointer-events: none;
  mix-blend-mode: overlay;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  position: relative;
  z-index: 2;
}

.card-title {
  font-size: 12px;
  font-weight: 700;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
  opacity: 0.9;
  text-shadow: 0 1px 1px var(--fg-outline);
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-pill {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 12px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
}

.action-pill:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-icon:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.icon {
  stroke: #ffffff;
  fill: none;
  width: 12px;
  height: 12px;
  paint-order: stroke fill;
  stroke-linejoin: round;
  filter: drop-shadow(0 1px 1px var(--fg-outline));
}

.card-content {
  position: relative;
  z-index: 2;
}

.content-heading {
  font-size: 28px;
  font-weight: 800;
  color: #ffffff;
  margin: 0 0 24px 0;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
  line-height: 1.2;
  text-shadow: 0 1px 1px var(--fg-outline);
}

.content-area {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.transcription-item {
  display: flex;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.transcription-item:last-child {
  border-bottom: none;
}

.item-number {
  font-size: 12px;
  font-weight: 500;
  color: #ffffff;
  opacity: 0.8;
  min-width: 18px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
}

.item-text {
  font-size: 12px;
  font-weight: 400;
  color: #ffffff;
  line-height: 1.5;
  flex: 1;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
  text-shadow: 0 1px 1px var(--fg-outline);
}

.placeholder-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: 12px;
}

.placeholder-text {
  font-size: 12px;
  color: #ffffff;
  opacity: 0.7;
  font-style: italic;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
  text-align: center;
}
</style>