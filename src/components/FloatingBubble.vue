<template>
  <!-- 可拖拽的悬浮球：收起为圆形，展开为胶囊；支持打开主窗口 -->
  <div
    class="bubble"
    :class="{ expanded: isExpanded }"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @click="toggleExpand"
  >
    <div v-if="!isExpanded" class="bubble-circle">
      <div class="wave" :class="{ active: isTranscribing }">
        <span class="bar" v-for="n in 4" :key="n" />
      </div>
    </div>
    <div v-else class="bubble-pill">
      <div class="wave" :class="{ active: isTranscribing }">
        <span class="bar" v-for="n in 4" :key="n" />
      </div>
      <span class="time">{{ elapsedLabel }}</span>
      <button class="open" @click.stop="openMain" title="打开转录">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5h10" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// 组件职责：
// - 展示录音波形动效与计时（通过 useTranscriptionTimer）
// - 支持拖拽并持久化位置（localStorage: bubble:lastPos）
// - 切换展开/收起，动态调整窗口尺寸与位置，并向主窗口广播状态
// - 点击“打开”按钮进入主窗口视图
import { onMounted, onUnmounted, ref } from 'vue'
import { useTranscriptionTimer } from '../composables/useTranscriptionTimer'

const { isTranscribing, elapsedLabel } = useTranscriptionTimer()

// UI 状态与拖拽状态变量
const isExpanded = ref(false)
let isDragging = false
let initialMouseX = 0
let initialMouseY = 0
let windowInitialX = 0
let windowInitialY = 0
let scaleFactor = 1
let didDrag = false
let shouldTrackPos = true
let unlistenMoved: (() => void) | null = null
let isProgrammaticMove = false

const DIAMETER = 48
const ANIM_DURATION = 300
const COLLAPSED_W = DIAMETER
const COLLAPSED_H = DIAMETER
const EXPANDED_W = 130
const EXPANDED_H = 40

// 安全设置窗口尺寸：某些平台可能抛出异常，统一吞掉
const setSizeSafe = async (size: { w: number, h: number }) => {
  try {
    const api = (window as any).api
    await api.bubble.setSize(size.w, size.h)
  } catch {}
}

// 读取窗口内位置，失败时回退到记录的初始位置
const getWindowPositionSafe = async () => {
  try {
    const api = (window as any).api
    const pos = await api.bubble.getPosition()
    return { x: pos.x, y: pos.y }
  } catch {
    return { x: windowInitialX, y: windowInitialY }
  }
}

// 将位置限制在屏幕逻辑坐标范围内，避免窗体拖拽出屏
const clampToScreenLogical = async (x: number, y: number, w: number, h: number) => {
  try {
    const api = (window as any).api
    const bounds = await api.bubble.getDisplayBounds()
    if (bounds) {
      const nx = Math.min(Math.max(0, x), Math.max(0, bounds.width - w))
      const ny = Math.min(Math.max(0, y), Math.max(0, bounds.height - h))
      return { x: nx, y: ny }
    }
  } catch {}
  return { x, y }
}

// 切换展开/收起：调整尺寸与位置并广播状态
const toggleExpand = async () => {
  if (isDragging || didDrag) { didDrag = false; return }
  const expand = !isExpanded.value
  try {
    const api = (window as any).api
    const pos = await api.bubble.getPosition()
    const newW = expand ? EXPANDED_W : COLLAPSED_W
    const newH = expand ? EXPANDED_H : COLLAPSED_H
    let newX = pos.x
    const newY = pos.y + (expand ? (COLLAPSED_H - EXPANDED_H) : (EXPANDED_H - COLLAPSED_H))
    try {
      const bounds = await api.bubble.getDisplayBounds()
      if (bounds) {
        const maxX = Math.max(0, bounds.width - newW - 16)
        newX = Math.min(Math.max(0, newX), maxX)
      }
    } catch {}
    isProgrammaticMove = true
    await api.bubble.setSize(newW, newH)
    await api.bubble.setPosition(newX, newY)
    setTimeout(() => { isProgrammaticMove = false }, 0)
    try { await api.bubble.setIgnoreMouse(false) } catch {}
  } catch {}
  isExpanded.value = expand
}

// 鼠标移动：超过微小阈值则视为拖拽并让系统接管拖动
const onMouseMove = async (e: MouseEvent) => {
  const deltaX = e.screenX - initialMouseX
  const deltaY = e.screenY - initialMouseY
  if (!isDragging && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
    isDragging = true
    didDrag = true
  }
  if (isDragging) {
    try {
      const api = (window as any).api
      await api.bubble.setPosition(windowInitialX + deltaX, windowInitialY + deltaY)
    } catch {}
  }
}

// 鼠标抬起：停止监听并持久化当前位置（用于下次恢复）
const onMouseUp = async () => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
  isDragging = false
  try {
    const api = (window as any).api
    const pos = await api.bubble.getPosition()
    const x = pos.x
    const y = pos.y
    if (!shouldTrackPos) return
    if (isProgrammaticMove) return
    if (typeof window !== 'undefined' && window.location.hash === '#main') return
    if (typeof x !== 'number' || typeof y !== 'number' || x <= -10000 || y <= -10000) return
    if (typeof localStorage !== 'undefined' && typeof x === 'number' && typeof y === 'number') {
      localStorage.setItem('bubble:lastPos', JSON.stringify({ x, y }))
    }
  } catch {}
}

// 鼠标按下：记录初始鼠标与窗口位置，并开始监听移动/抬起
const handleMouseDown = async (e: MouseEvent) => {
  if (isExpanded.value) return
  isDragging = false
  didDrag = false
  initialMouseX = e.screenX
  initialMouseY = e.screenY
  const pos = await getWindowPositionSafe()
  windowInitialX = pos.x
  windowInitialY = pos.y
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

// 打开主窗口视图：调整窗口属性并居中显示
const openMain = async () => {
  try {
    const api = (window as any).api
    shouldTrackPos = false
    isProgrammaticMove = true
    await api.bubble.openMain()
    setTimeout(() => { isProgrammaticMove = false }, 0)
  } catch {}
}

// 初始化：设置收起尺寸、读取缩放因子并监听移动事件以持久化位置
onMounted(async () => {
  await setSizeSafe({ w: COLLAPSED_W, h: COLLAPSED_H })
  try {
    const api = (window as any).api
    const bounds = await api.bubble.getDisplayBounds()
    scaleFactor = bounds?.scaleFactor ?? 1
  } catch { scaleFactor = 1 }
})

// 清理事件监听，避免内存泄漏与重复绑定
onUnmounted(() => {
  try {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  } catch {}
})
</script>

<style scoped>
/* 悬浮球的形态与交互样式：圆形与胶囊两态、波形动画与按钮行为 */
.bubble {
  position: fixed;
  left: 0;
  bottom: 0;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: transparent;
  transition: width 220ms cubic-bezier(0.2, 0, 0, 1), height 180ms ease, border-radius 180ms ease;
  transform-origin: left bottom;
  user-select: none;
  z-index: 9999;
}

.bubble.expanded {
  width: 130px;
  height: 40px;
  border-radius: 999px;
}

.bubble-circle {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(6, 10, 19, 0.95);
  box-shadow: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bubble-pill {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: rgba(6, 10, 19, 0.98);
  box-shadow: none;
}

.wave {
  width: 16px;
  height: 13px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.bubble.expanded .wave {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.bar {
  width: 2px;
  height: 4px;
  border-radius: 999px;
  background: #22c55e;
  transform-origin: bottom;
}

.wave.active .bar:nth-child(1) { animation: wave 0.8s ease-in-out infinite; }
.wave.active .bar:nth-child(2) { animation: wave 0.8s ease-in-out infinite 0.1s; }
.wave.active .bar:nth-child(3) { animation: wave 0.8s ease-in-out infinite 0.2s; }
.wave.active .bar:nth-child(4) { animation: wave 0.8s ease-in-out infinite 0.3s; }

@keyframes wave { 0%,100%{height:4px;} 50%{height:14px;} }

.time {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #e6fef3;
  min-width: 46px;
  text-align: center;
}

.open {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(6, 10, 19, 1);
  color: #cfe2ff;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.open:hover { background: rgba(16,185,129,0.35); transform: translateY(-50%) scale(1.08); }
.open:active { transform: translateY(-50%) scale(0.95); }
</style>
