<template>
  <div class="ui-root" :class="[uiState, { 'modal-open': confirmOpen }]">
    <div class="capsule-bar" @pointerdown="onCapsulePointerDown" @pointerup="onCapsulePointerUp"
      @pointermove="onCapsulePointerMove">
      <button class="cap-btn no-drag" :class="{ active: audioStore.isMicActive }" title="麦克风" @click="onMic">
        <template v-if="audioStore.isMicActive">
          <span class="cap-label">停止</span>
          <svg class="iconfont-svg" aria-hidden="true" viewBox="0 0 1024 1024">
            <path d="M722.9375 933.875H301.0625a210.9375 210.9375 0 0 1-210.9375-210.9375V301.0625a210.9375 210.9375 0 0 1 210.9375-210.9375h421.875a210.9375 210.9375 0 0 1 210.9375 210.9375v421.875a210.9375 210.9375 0 0 1-210.9375 210.9375z" />
          </svg>
        </template>
        <template v-else>
          <svg class="iconfont-svg" aria-hidden="true"><use href="#icon-yuyinshuru" xlink:href="#icon-yuyinshuru" /></svg>
        </template>
      </button>
      <div class="cap-group">
        <button class="cap-btn primary no-drag" :class="{ active: audioStore.isSpeakerActive }" title="扬声器"
          @click="onSpeaker">
          <template v-if="audioStore.isSpeakerActive">
            <span class="cap-label">停止</span>
            <svg class="iconfont-svg" aria-hidden="true" viewBox="0 0 1024 1024">
              <path d="M722.9375 933.875H301.0625a210.9375 210.9375 0 0 1-210.9375-210.9375V301.0625a210.9375 210.9375 0 0 1 210.9375-210.9375h421.875a210.9375 210.9375 0 0 1 210.9375 210.9375v421.875a210.9375 210.9375 0 0 1-210.9375 210.9375z" />
            </svg>
          </template>
          <template v-else>
            <svg class="iconfont-svg" aria-hidden="true"><use href="#icon-yangshengqi" xlink:href="#icon-yangshengqi" /></svg>
          </template>
        </button>
      </div>
      <button class="cap-btn no-drag" title="保存">
        <svg class="iconfont-svg" aria-hidden="true"><use href="#icon-baocun" xlink:href="#icon-baocun" /></svg>
      </button>
      <button class="cap-btn no-drag" title="设置">
        <svg class="iconfont-svg" aria-hidden="true"><use href="#icon-shezhi" xlink:href="#icon-shezhi" /></svg>
      </button>
    </div>

    <div class="card listen" v-show="isActive && uiState !== 'hidden'">
      <div class="card-top">
        <div class="card-title">{{ audioStore.isSpeakerActive ? '扬声器' : audioStore.isMicActive ? '麦克风' : '' }} {{ elapsedLabel }}</div>
        <div class="card-actions">
          <button class="top-pill no-drag" @click="toggleInsights">显示洞察</button>
          <button class="top-pill no-drag" @click="copyContent">复制</button>
        </div>
      </div>
      <div class="card-divider"></div>
      <div class="card-body" :class="{ loading: isTranscribing && audioStore.transcriptions.length === 0 }">
        <div class="loading-dots" v-if="isTranscribing && audioStore.transcriptions.length === 0">
          <span></span><span></span><span></span></div>
        <div class="scroll" ref="scrollRef" v-else>
          <div v-for="(item, idx) in audioStore.transcriptions" :key="idx" class="bubble">
            <div class="meta">
              <svg class="iconfont-svg" aria-hidden="true"><use href="#icon-renyuan" xlink:href="#icon-renyuan" /></svg>
              <span class="speaker">{{ speakerIds[idx] }}</span>
              <span class="meta-time">{{ formatTs(item.ts) }}</span>
            </div>
            <div class="content">{{ typedText[idx] ?? item.text }}</div>
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
  <ConfirmDialog
    :open="confirmOpen"
    title="是否切换音频？"
    :content="confirmMsg"
    cancel-text="取消"
    confirm-text="确定"
    :loading="isSwitching"
    @cancel="confirmCancel"
    @confirm="confirmOk"
  />
  
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { useTranscriptionTimer } from '../composables/useTranscriptionTimer'

const { audioStore, isTranscribing, elapsedLabel } = useTranscriptionTimer()

const isListening = ref(false)
const justDragged = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const uiState = ref<'showing' | 'hiding' | 'sliding-in' | 'hidden'>('showing')
const showAsk = ref(false)
const askText = ref('')
const scrollRef = ref<HTMLDivElement | null>(null)
const typedText = ref<string[]>([])
const typingTimers = new Map<number, number>()
const autoScroll = ref(true)
const scrollThreshold = 6

const isCompleted = computed(() => !isTranscribing.value && audioStore.transcriptions.length > 0)
const isActive = computed(() => audioStore.isSpeakerActive || audioStore.isMicActive)

const confirmOpen = ref(false)
const confirmTarget = ref<'mic' | 'speaker' | 'stopMic' | 'stopSpeaker' | null>(null)
const confirmMsg = ref('')
const isSwitching = ref(false)

const speakerIds = ref<number[]>([])
watch(() => audioStore.transcriptions.length, (len) => {
  while (speakerIds.value.length < len) {
    speakerIds.value.push(Math.floor(Math.random() * 6) + 1)
  }
  if (speakerIds.value.length > len) {
    speakerIds.value.length = len
  }
  while (typedText.value.length < len) {
    typedText.value.push('')
  }
  if (typedText.value.length > len) {
    typedText.value.length = len
  }
  for (const [, timer] of typingTimers) {
    clearInterval(timer)
  }
  typingTimers.clear()
  for (let i = 0; i < len - 1; i++) {
    typedText.value[i] = audioStore.transcriptions[i].text
  }
  if (len > 0) {
    const idx = len - 1
    startTyping(audioStore.transcriptions[idx].text, idx)
    nextTick(() => ensureScrollToBottom())
  }
})

const pad = (n: number) => (n < 10 ? '0' + n : '' + n)
const formatTs = (ts: any) => {
  let d: Date | null = null
  if (typeof ts === 'number') {
    d = new Date(ts)
  } else if (typeof ts === 'string') {
    const tryNum = Number(ts)
    if (!Number.isNaN(tryNum)) d = new Date(tryNum)
    else {
      const parsed = new Date(ts)
      d = isNaN(parsed.getTime()) ? null : parsed
    }
  }
  if (!d) d = new Date()
  const y = d.getFullYear()
  const m = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const h = pad(d.getHours())
  const mi = pad(d.getMinutes())
  const s = pad(d.getSeconds())
  return `${y}-${m}-${day} ${h}:${mi}:${s}`
}
const ensureScrollToBottom = () => {
  const el = scrollRef.value
  if (!el || !autoScroll.value) return
  el.scrollTop = el.scrollHeight
}
const startTyping = (text: string, idx: number) => {
  const prev = typingTimers.get(idx)
  if (prev) {
    clearInterval(prev)
    typingTimers.delete(idx)
  }
  typedText.value[idx] = ''
  let i = 0
  const timer = window.setInterval(() => {
    typedText.value[idx] += text[i] || ''
    i++
    ensureScrollToBottom()
    if (i >= text.length) {
      clearInterval(timer)
      typingTimers.delete(idx)
    }
  }, 40)
  typingTimers.set(idx, timer)
}

const updateAutoScroll = () => {
  const el = scrollRef.value
  if (!el) return
  autoScroll.value = el.scrollTop + el.clientHeight >= el.scrollHeight - scrollThreshold
}

onMounted(() => {
  const el = scrollRef.value
  if (el) el.addEventListener('scroll', updateAutoScroll)
})

onUnmounted(() => {
  const el = scrollRef.value
  if (el) el.removeEventListener('scroll', updateAutoScroll)
  for (const [, t] of typingTimers) clearInterval(t)
  typingTimers.clear()
})

const onSpeaker = async () => {
  if (justDragged.value) return
  if (audioStore.isSpeakerActive) {
    await audioStore.stopCapture()
    return
  }
  if (audioStore.isMicActive) {
    confirmTarget.value = 'speaker'
    confirmMsg.value = '将切换到扬声器并先停止麦克风。'
    confirmOpen.value = true
    return
  }
  await audioStore.startSpeaker()
  isListening.value = true
}

const onMic = async () => {
  if (justDragged.value) return
  if (audioStore.isMicActive) {
    await audioStore.stopCapture()
    return
  }
  if (audioStore.isSpeakerActive) {
    confirmTarget.value = 'mic'
    confirmMsg.value = '将切换到麦克风并先停止扬声器。'
    confirmOpen.value = true
    return
  }
  await audioStore.startMicrophone()
  isListening.value = true
}

const confirmCancel = () => {
  if (isSwitching.value) return
  confirmOpen.value = false
  confirmTarget.value = null
}

const confirmOk = async () => {
  if (!confirmTarget.value) return
  isSwitching.value = true
  try {
    const t0 = Date.now()
    await audioStore.stopCapture()
    if (confirmTarget.value === 'mic') {
      await audioStore.startMicrophone()
      isListening.value = true
    } else if (confirmTarget.value === 'speaker') {
      await audioStore.startSpeaker()
      isListening.value = true
    }
    const elapsed = Date.now() - t0
    if (elapsed < 2000) await new Promise(r => setTimeout(r, 2000 - elapsed))
  } finally {
    isSwitching.value = false
    confirmOpen.value = false
    confirmTarget.value = null
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
  --card-w: 425px;
  --card-h: 500px;
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

.ui-root.modal-open { pointer-events: none }

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
  justify-content: space-between;
  -webkit-app-region: drag;
}

.cap-btn[disabled], .cap-btn.switching { opacity: .6; pointer-events: none }
.btn-spinner { width: 14px; height: 14px; display: inline-block; border-radius: 50%; background: conic-gradient(from 0deg, rgba(255,255,255,.95) 0deg 120deg, rgba(230,230,230,.25) 120deg 360deg); -webkit-mask: radial-gradient(farthest-side, #0000 calc(100% - 2px), #000 0); mask: radial-gradient(farthest-side, #0000 calc(100% - 2px), #000 0); animation: spin .8s linear infinite }
.btn-spinner-left { width: 0; height: 14px; display: inline-flex; align-items: center; justify-content: center; opacity: 0; transition: width .2s ease, opacity .2s ease }
.btn-spinner-left::after { content: ''; width: 14px; height: 14px; display: block; border-radius: 50%; background: conic-gradient(from 0deg, rgba(255,255,255,.95) 0deg 120deg, rgba(230,230,230,.25) 120deg 360deg); -webkit-mask: radial-gradient(farthest-side, #0000 calc(100% - 2px), #000 0); mask: radial-gradient(farthest-side, #0000 calc(100% - 2px), #000 0); animation: spin .8s linear infinite }
.btn-spinner-left.active { width: 14px; opacity: 1 }
@keyframes spin { to { transform: rotate(360deg) } }

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

.cap-gap { display: none }

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
  color: #ffffff;
  border: 0;
  cursor: pointer;
  font: 600 13px var(--font-sans, system-ui);
  outline: none
}

.cap-btn:focus,
.cap-btn:focus-visible {
  outline: none;
  box-shadow: none
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
  width: 14px;
  height: 14px;
  stroke: currentColor
}

.icon-white { color: #fff }

/* Capsule bar icon size increase by 4px */
.capsule-bar .iconfont-svg { width: 18px; height: 18px }

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
  max-width: 92vw;
  height: var(--card-h);
  display: flex;
  flex-direction: column
}

.confirm-overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: transparent; z-index: 999999 }
.confirm-card { position: relative; width: 360px; max-width: 90vw; padding: 16px 16px 48px; border-radius: 16px; backdrop-filter: blur(18px) saturate(180%); -webkit-backdrop-filter: blur(18px) saturate(180%); background: rgba(39,39,39,.90); border: 1px solid rgba(255,255,255,.3); transform: translateY(-100px) }
.confirm-header { margin: 0 -16px 12px; padding: 0 16px 8px; border-bottom: 1px solid rgba(255,255,255,.1) }
.confirm-title { font: 700 14px var(--font-sans, system-ui); color: rgba(255,255,255,.95); margin: 0 }
.confirm-msg { font: 400 13px var(--font-sans, system-ui); color: rgba(255,255,255,.85); margin-bottom: 12px }
.confirm-actions { position: absolute; right: 12px; bottom: 12px; display: flex; gap: 8px }
.confirm-btn { min-width: 64px; height: 28px; padding: 0 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,.2); background: transparent; color: rgba(255,255,255,.9); display: inline-flex; align-items: center; justify-content: center; gap: 6px; position: relative; line-height: 1 }
.confirm-btn.primary { background: rgba(255,0,0,.6); border-color: rgba(255,255,255,.2); color: #fff }
.confirm-btn[disabled] { opacity: .6; pointer-events: none }
.btn-inner { display: inline-flex; align-items: center; justify-content: center; height: 100%; gap: 0 }
.btn-inner.with-gap { gap: 8px }
.btn-text { display: inline-flex; align-items: center; justify-content: center; height: 100%; line-height: 1 }

.card.listen::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  clip-path: inset(0 round 12px);
  background: rgba(0, 0, 0, .6)
}

.card.listen::after {
  content: '';
  position: absolute;
  inset: 0;
  padding: 1px;
  border-radius: inherit;
  clip-path: inset(0 round 12px);
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
  padding: 10px 0 10px 10px;
  flex: 1;
  overflow: hidden
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
  height: 100%;
  overflow: auto;
  padding-right: 10px;
  box-sizing: content-box
}

.scroll::-webkit-scrollbar {
  width: 6px
}

.scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, .2)
}

.scroll:hover::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, .35)
}

.bubble {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px 4px;
  border-radius: 8px;
  margin-bottom: 14px
}

.meta { display: inline-flex; align-items: baseline; gap: 0; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.18); color: rgba(255,255,255,.7); font: 600 12px var(--font-sans, system-ui); align-self: flex-start; width: fit-content }
.meta-icon { width: 14px; height: 14px; color: #fff; fill: currentColor }
.icon-white use { fill: currentColor !important; stroke: currentColor !important }
.speaker { color: rgba(255,255,255,.6); margin-left: 2px; font-size: 11px; line-height: 12px }
.meta .iconfont-svg { width: 10px; height: 10px; color: rgba(255,255,255,.6); align-self: baseline }
.sep { opacity: .6 }
.meta-time { color: rgba(255,255,255,.6); font: 500 12px var(--font-mono, ui-monospace); margin-left: 12px; line-height: 12px }

.content { color: rgba(255,255,255,.95); font: 600 14px var(--font-sans, system-ui); margin-left: 12px }


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

/* 让所有胶囊条里的 SVG 填充跟随当前 color */
.capsule-bar .iconfont-svg {
  width: 18px;
  height: 18px;
  fill: currentColor;          /* 把填充色交给 color 属性决定 */
}
</style>