<template>
  <div class="ui-root" :class="uiState">
    <div class="capsule-bar" @pointerdown="onCapsulePointerDown" @pointerup="onCapsulePointerUp"
      @pointermove="onCapsulePointerMove">
      <button class="cap-btn primary no-drag" :class="{ active: isListening, completed: isCompleted }"
        @click="onListen">
        <span class="cap-label">Listen</span>
        <svg class="cap-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2">
          <rect x="4" y="8" width="3" height="8" rx="1" />
          <rect x="9" y="5" width="3" height="14" rx="1" />
          <rect x="14" y="8" width="3" height="8" rx="1" />
          <rect x="19" y="11" width="3" height="2" rx="1" />
        </svg>
      </button>
      <div class="cap-gap"></div>
      <div class="cap-group">
        <button class="cap-btn no-drag" @click="showAsk = true"><span class="cap-label">提问</span></button>
        <div class="cap-gap"></div>
        <div class="shortcut no-drag">^</div>
        <div class="shortcut no-drag">↵</div>
      </div>
      <div class="cap-gap"></div>
      <button class="cap-btn no-drag" @click="toggleUI"><span class="cap-label">显示/隐藏</span>
        <div class="shortcut">^</div>
        <div class="shortcut">\</div>
      </button>
      <div class="cap-gap"></div>
      <button class="cap-btn menu no-drag" @click="openMenu">
        <svg class="cap-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2">
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </button>
    </div>

    <div class="card listen" v-show="isListening && uiState !== 'hidden'">
      <div class="card-top">
        <div class="card-title">正在监听 {{ elapsedLabel }}</div>
        <div class="card-actions">
          <button class="top-pill no-drag" @click="toggleInsights">显示洞察</button>
          <button class="top-pill no-drag" @click="copyContent">复制</button>
        </div>
      </div>
      <div class="card-divider"></div>
      <div class="card-body" :class="{ loading: isTranscribing && audioStore.transcriptions.length === 0 }">
        <div class="loading-dots" v-if="isTranscribing && audioStore.transcriptions.length === 0">
          <span></span><span></span><span></span></div>
        <div class="scroll" v-else>
          <div v-for="(item, idx) in audioStore.transcriptions" :key="idx" class="bubble"
            :class="idx % 2 === 0 ? 'other' : 'me'">
            <div class="text">{{ item.text }}</div>
            <div class="time">{{ item.ts || '' }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="card ask" v-if="showAsk">
    <div class="card-top">
      <div class="card-title">提问</div>
    </div>
    <div class="card-divider"></div>
    <div class="ask-body">
      <div class="ask-scroll">
        <div class="ask-line">
          <div class="line-copy">复制</div>
          <div class="line-text">示例内容</div>
        </div>
      </div>
      <div class="ask-input">
        <input class="input" v-model="askText" placeholder="输入问题" />
        <div class="actions"><button class="icon-btn">发送</button><button class="icon-btn"
            @click="askText = ''">清空</button></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTranscriptionTimer } from '../composables/useTranscriptionTimer'

const { audioStore, isTranscribing, elapsedLabel } = useTranscriptionTimer()

const isListening = ref(false)
const justDragged = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const uiState = ref<'showing' | 'hiding' | 'sliding-in' | 'hidden'>('showing')
const showAsk = ref(false)
const askText = ref('')

const isCompleted = computed(() => !isTranscribing.value && audioStore.transcriptions.length > 0)

const onListen = async () => {
  if (justDragged.value) return
  isListening.value = !isListening.value
  if (isListening.value) {
    await audioStore.startMicrophone()
  } else {
    await audioStore.stopCapture()
  }
}

const toggleUI = () => {
  if (uiState.value === 'hidden') {
    uiState.value = 'sliding-in'
    setTimeout(() => uiState.value = 'showing', 300)
  } else {
    uiState.value = 'hiding'
    setTimeout(() => uiState.value = 'hidden', 300)
  }
}

const toggleInsights = () => { }
const openMenu = () => { }

const copyContent = () => {
  const text = audioStore.transcriptions.map(t => t.text).join('\n') || 'Waiting for speech...'
  navigator.clipboard.writeText(text)
}

const onCapsulePointerDown = (e: PointerEvent) => {
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY
}

const onCapsulePointerUp = (e: PointerEvent) => {
  const dx = e.clientX - dragStartX.value
  const dy = e.clientY - dragStartY.value
  if (Math.sqrt(dx * dx + dy * dy) > 3) {
    justDragged.value = true
    setTimeout(() => justDragged.value = false, 200)
  }
}

const onCapsulePointerMove = (_e: PointerEvent) => { }
</script>

<style scoped>
.ui-root {
  position: relative;
  --card-w: clamp(460px, 68vw, 960px);
}

.ui-root.showing {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: none;
  transition: opacity .3s, transform .3s
}

.ui-root.hiding {
  opacity: 0;
  transform: translateY(6px) scale(.98);
  filter: blur(2px);
  transition: opacity .3s, transform .3s
}

.ui-root.sliding-in {
  opacity: 0;
  transform: translateY(-8px) scale(.98);
  filter: blur(2px);
  transition: opacity .3s, transform .3s
}

.ui-root.hidden {
  opacity: 0;
  pointer-events: none
}

.capsule-bar {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  height: 35px;
  width: calc(var(--card-w) * .75);
  border-radius: 9999px;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 4px;
  -webkit-app-region: drag;
}

.capsule-bar::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  background: rgba(0, 0, 0, .6)
}

.capsule-bar::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  padding: 1px;
  -webkit-mask: linear-gradient(#000, #000) content-box, linear-gradient(#000, #000);
  -webkit-mask-composite: xor;
  background: rgba(255, 255, 255, .3)
}

.cap-gap {
  width: 2px;
  height: 1px
}

.cap-group {
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 6px
}

.cap-btn {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  border-radius: 9999px;
  background: transparent;
  color: rgba(255, 255, 255, .95);
  border: 0;
  cursor: pointer;
  font: 600 13px var(--font-sans, system-ui)
}

.cap-btn:hover {
  background: rgba(255, 255, 255, .1)
}

.cap-btn.active {
  background: rgba(255, 0, 0, .55);
  color: #fff
}

.cap-btn.completed {
  background: rgba(255, 255, 255, .6);
  color: #000
}

.cap-btn.completed::after {
  display: none
}

.cap-btn.menu {
  width: 29px;
  height: 29px;
  justify-content: center
}

.cap-label {
  white-space: nowrap
}

.cap-icon {
  width: 10px;
  height: 10px;
  stroke: currentColor
}

.shortcut {
  width: 13px;
  height: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, .1);
  font: 600 8px var(--font-mono, ui-monospace);
  color: rgba(255, 255, 255, .95)
}

.card {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 12px;
  overflow: hidden
}

.card.listen {
  top: 82px;
  width: var(--card-w);
  max-width: 92vw
}

.card.listen::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, .6)
}

.card.listen::after {
  content: '';
  position: absolute;
  inset: 0;
  padding: 1px;
  border-radius: 12px;
  -webkit-mask: linear-gradient(#000, #000) content-box, linear-gradient(#000, #000);
  -webkit-mask-composite: xor;
  background: rgba(255, 255, 255, .3)
}

.card-top {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 30px;
  padding: 8px 12px
}

.card-divider {
  position: relative;
  z-index: 1;
  height: 1px;
  background: rgba(255, 255, 255, .1)
}

.card-actions {
  display: flex;
  gap: 6px
}

.top-pill {
  border: 0;
  border-radius: 12px;
  padding: 4px 10px;
  background: transparent;
  color: rgba(255, 255, 255, .9);
  cursor: pointer
}

.top-pill:hover {
  background: rgba(255, 255, 255, .1)
}

.card-title {
  font: 700 13px var(--font-sans, system-ui);
  color: rgba(255, 255, 255, .95)
}

.card-body {
  position: relative;
  z-index: 1;
  padding: 10px
}

.card-body.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px
}

.loading-dots {
  display: inline-flex;
  gap: 6px
}

.loading-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, .6);
  animation: pulse .9s infinite ease-in-out
}

.loading-dots span:nth-child(2) {
  animation-delay: .15s
}

.loading-dots span:nth-child(3) {
  animation-delay: .3s
}

@keyframes pulse {

  0%,
  100% {
    opacity: .4;
    transform: scale(.9)
  }

  50% {
    opacity: 1;
    transform: scale(1.1)
  }
}

.scroll {
  max-height: 320px;
  overflow: auto
}

.scroll::-webkit-scrollbar {
  width: 8px
}

.scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, .2)
}

.scroll:hover::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, .35)
}

.bubble {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  margin-bottom: 6px
}

.bubble.other {
  background: rgba(255, 255, 255, .1);
  color: #fff
}

.bubble.me {
  background: rgba(0, 122, 255, .8);
  color: #fff
}

.bubble .text {
  flex: 1;
  font: 400 12px var(--font-sans, system-ui)
}

.bubble .time {
  opacity: .7;
  font: 400 10px var(--font-mono, ui-monospace)
}

.ask {
  top: calc(128px + 420px);
  width: var(--card-w);
  max-width: 92vw;
  backdrop-filter: blur(10px)
}

.ask::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, .6)
}

.ask::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid rgba(255, 255, 255, .3);
  border-radius: 12px
}

.ask-body {
  position: relative;
  z-index: 1
}

.ask-scroll {
  max-height: 240px;
  overflow: auto;
  padding: 8px 12px
}

.ask-line {
  display: flex;
  align-items: center;
  padding: 4px 6px;
  border-radius: 8px
}

.ask-line:hover {
  background: rgba(255, 255, 255, .05)
}

.line-copy {
  margin-right: 12px;
  border: 1px solid rgba(255, 255, 255, .2);
  border-radius: 8px;
  padding: 2px 6px
}

.line-text {
  flex: 1
}

.ask-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-top: 1px solid rgba(255, 255, 255, .1);
  background: rgba(0, 0, 0, .2)
}

.input {
  flex: 1;
  height: 28px;
  border-radius: 20px;
  border: 0;
  padding: 0 12px;
  background: rgba(0, 0, 0, .6);
  color: #fff
}

.input::placeholder {
  color: rgba(255, 255, 255, .6)
}

.actions {
  display: flex;
  gap: 4px
}

.icon-btn {
  height: 26px;
  padding: 0 8px;
  border-radius: 999px;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, .9)
}

.icon-btn:hover {
  background: rgba(255, 255, 255, .1)}
</style>