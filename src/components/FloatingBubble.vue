<template>
  <!-- 可拖拽的悬浮球：收起为圆形，展开为胶囊；支持打开主窗口 -->
  <div
    class="bubble"
    :class="{ expanded: isExpanded }"
    @mouseup="onMouseUp"
    ref="bubbleRef"
  >
    <div v-if="!isExpanded" class="bubble-circle">
      <div class="wave" :class="{ active: isTranscribing || isAnimating }" @click="toggleExpand">
        <span class="bar" v-for="(h,i) in barHeights" :key="i" :style="{ height: h + 'px' }" />
      </div>
    </div>
    <div v-else class="bubble-pill">
      <div class="wave" :class="{ active: isTranscribing || isAnimating }" @click="toggleExpand">
        <span class="bar" v-for="(h,i) in barHeights" :key="i" :style="{ height: h + 'px' }" />
      </div>
      <span class="time">{{ elapsedLabel }}</span>
      <button class="open" @click.stop="openMain" title="打开转录">
        <svg class="open-icon" width="18" height="18" aria-hidden="true" viewBox="0 0 1024 1024" style="fill:#ffffff">
          <path d="M832.7168 496.2816c-16.9472 0-30.72 13.7728-30.72 30.72v281.1392c0 22.0672-17.9712 40.0384-40.0384 40.0384H223.8976c-22.0672 0-40.0384-17.9712-40.0384-40.0384V230.9632c0-22.0672 17.9712-40.0384 40.0384-40.0384h325.8368c16.9472 0 30.72-13.7728 30.72-30.72s-13.7728-30.72-30.72-30.72H223.8976c-55.9616 0-101.4784 45.5168-101.4784 101.4784v577.1776c0 55.9616 45.5168 101.4784 101.4784 101.4784h538.0608c55.9616 0 101.4784-45.5168 101.4784-101.4784v-281.1392c0-16.9472-13.7728-30.72-30.72-30.72z"></path>
          <path d="M909.2608 210.5856l-73.728-73.728c-25.5488-25.5488-67.072-25.5488-92.5696 0l-313.344 313.2928c-3.8912 3.8912-6.656 8.7552-8.0384 14.08l-40.5504 157.8496a30.67392 30.67392 0 0 0 29.7472 38.3488c2.1504 0 4.3008-0.2048 6.4-0.6656l163.4304-34.9696c5.7856-1.2288 11.1104-4.1472 15.3088-8.3456l313.2928-313.2928c25.5488-25.4976 25.5488-67.0208 0.0512-92.5696z m-350.3616 356.0448l-106.0352 22.6816 26.112-101.632L700.928 265.728l81.7664 77.1584-223.7952 223.744z m306.8928-306.8928l-39.68 39.68-81.7664-77.1584 41.984-41.984a4.096 4.096 0 0 1 5.7344 0l73.728 73.728c1.5872 1.6384 1.5872 4.1984 0 5.7344z"></path>
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
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useAudioStore } from '../stores/audioStore'
import { useRecordingTimer } from '../composables/useRecordingTimer'

// 音频采集状态（Pinia）
const audioStore = useAudioStore()
// 是否正在转录（麦克风或扬声器任一激活）
const isTranscribing = computed(() => audioStore.isMicActive || audioStore.isSpeakerActive)

// UI 状态与拖拽状态变量
const isExpanded = ref(false) // 是否处于展开（胶囊）态
let isDragging = false // 是否处于拖拽过程（系统拖拽）
let initialMouseX = 0 // 鼠标按下屏幕坐标 X
let initialMouseY = 0 // 鼠标按下屏幕坐标 Y
let windowInitialX = 0 // 鼠标按下时窗口 X
let windowInitialY = 0 // 鼠标按下时窗口 Y
let scaleFactor = 1 // 显示器缩放因子（用于位置换算）
let didDrag = false // 是否发生了拖拽动作
let shouldTrackPos = true // 是否持久化位置到 localStorage
let unlistenMoved: (() => void) | null = null // 预留：取消移动事件句柄
let isProgrammaticMove = false // 程序化移动标记，避免误存位置
const bubbleRef = ref<HTMLElement | null>(null)


const DIAMETER = 48 // 收起（圆形）直径
const ANIM_DURATION = 300 // 展开/收起动画时长（ms）
const COLLAPSED_W = DIAMETER // 收起宽度
const COLLAPSED_H = DIAMETER // 收起高度
const EXPANDED_W = 130 // 展开宽度
const EXPANDED_H = COLLAPSED_H // 展开高度与收起一致避免抖动

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

// 设置展开/收起（仅改尺寸，不改坐标，以避免抖动与误触发离开）
const setExpanded = async (expand: boolean) => {
  try {
    const api = (window as any).api
    const pos = await api.bubble.getPosition()
  const newW = expand ? EXPANDED_W : COLLAPSED_W
  const newH = expand ? EXPANDED_H : COLLAPSED_H
  const newY = pos.y
  isProgrammaticMove = true
  await api.bubble.setSize(newW, newH)
  setTimeout(() => { isProgrammaticMove = false }, 0)
  try { await api.bubble.setIgnoreMouse(false) } catch {}
  } catch {}
  isExpanded.value = expand
}
const toggleExpand = async () => { await setExpanded(!isExpanded.value) }

// 鼠标移动：超过微小阈值则视为拖拽并让系统接管拖动
 

// 鼠标抬起：停止监听并持久化当前位置（用于下次恢复）
// 鼠标抬起：持久化位置到 localStorage（避免异常坐标）
const onMouseUp = async () => {
  document.removeEventListener('mouseup', onMouseUp)
  isDragging = false
  try {
    const api = (window as any).api
    const pos = await api.bubble.getPosition()
    let x = pos.x
    let y = pos.y
    try {
      const bounds = await api.bubble.getDisplayBounds()
      const w = isExpanded.value ? EXPANDED_W : COLLAPSED_W
      const h = isExpanded.value ? EXPANDED_H : COLLAPSED_H
      const maxX = Math.max(0, (bounds?.width ?? w) - w)
      const maxY = Math.max(0, (bounds?.height ?? h) - h)
      x = Math.min(Math.max(0, x), maxX)
      y = Math.min(Math.max(0, y), maxY)
      const SNAP = 12
      if (x < SNAP) x = 0
      if (maxX - x < SNAP) x = maxX
      if (y < SNAP) y = 0
      if (maxY - y < SNAP) y = maxY
      await api.bubble.setPosition(x, y)
      const nearEdge = (x === 0) || (x === maxX)
      if (nearEdge && isExpanded.value) await setExpanded(false)
      if (!nearEdge && !isExpanded.value) await setExpanded(true)
    } catch {}
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
 

// 打开主窗口视图：调整窗口属性并居中显示
// 打开主窗口视图：并标记程序化移动避免误保存
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
// 初始化：设置初始尺寸、读取显示器缩放、订阅动画/展开事件、注册全局鼠标检测
onMounted(async () => {
  await setSizeSafe({ w: COLLAPSED_W, h: COLLAPSED_H })
  try {
    const api = (window as any).api
    const bounds = await api.bubble.getDisplayBounds()
    scaleFactor = bounds?.scaleFactor ?? 1
    try { if (api.bubble?.onAnimating) api.bubble.onAnimating((state: boolean) => { isAnimating.value = !!state }) } catch {}
    try { if (api.bubble?.onExpanded) api.bubble.onExpanded(async (state: boolean) => { await setExpanded(!!state) }) } catch {}
  } catch { scaleFactor = 1 }
})

// 清理事件监听，避免内存泄漏与重复绑定
// 卸载清理：移除事件监听与定时器
onUnmounted(() => {
  try {
    document.removeEventListener('mouseup', onMouseUp)
  } catch {}
  try { } catch {}
})
const useSvg = ref(false)
const svgPath = '/wave/equalizer.svg'
const isAnimating = ref(false)
const isActive = computed(() => isAnimating.value || isTranscribing.value)
const { elapsedLabel } = useRecordingTimer(isActive)

// 静止基线高度（中心高、两侧递减）
const baseHeights = [4, 6, 9, 12, 18, 12, 9]
// 当前显示高度数组（每帧平滑逼近目标）
const barHeights = ref<number[]>([...baseHeights])
// 定时器句柄
let waveTimer: number | null = null
// 正弦波相位（控制波峰推进）
let phase = 0
// 噪声相位（平滑随机扰动）
let noisePhase = 0
// 心跳尖峰强度（触发后指数衰减）
let beatStrength = 0
// 心跳尖峰所在柱索引（随机选择）
let beatIndex = 0
// 下次心跳触发时间戳
let nextBeatTs = 0
// 线性插值：控制高度渐进，避免突变
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
// 启动波动：推进相位、生成尖峰、更新高度
const startWave = () => {
  if (waveTimer !== null) return
  // 计划下一次心跳尖峰（随机柱位+随机强度）
  const scheduleBeat = () => { beatIndex = Math.floor(Math.random() * 7); beatStrength = 14 + Math.random() * 10; nextBeatTs = Date.now() + 650 + Math.random() * 500 }
  scheduleBeat()
  waveTimer = window.setInterval(() => {
    // 略微加快：相位推进与噪声相位
    phase += 0.16
    noisePhase += 0.07
    if (Date.now() >= nextBeatTs) scheduleBeat(); else beatStrength *= 0.88
    const A = 1.6
    for (let i = 0; i < barHeights.value.length; i++) {
      // 平滑噪声 + 正弦波 + 心跳尖峰（核衰减）
      const noise = Math.sin(noisePhase + i * 1.1) * 0.4
      const wave = Math.sin(phase + i * 0.9) * A
      const kernel = Math.max(0, 1 - Math.abs(i - beatIndex) / 2)
      const spike = beatStrength * kernel
      const target = baseHeights[i] + wave + noise + spike
      const h = Math.max(3, Math.min(24, lerp(barHeights.value[i], target, 0.35)))
      barHeights.value[i] = h
    }
  }, 55)
}
// 停止波动：清理定时器并复位到静止基线
const stopWave = () => {
  if (waveTimer !== null) { window.clearInterval(waveTimer); waveTimer = null }
  barHeights.value = [...baseHeights]
}
// 根据活跃状态启停波动（联动主窗口采集状态）
watch(isActive, (active) => { active ? startWave() : stopWave() }, { immediate: true })
onUnmounted(() => { stopWave() })

</script>

<style scoped>
/* 悬浮球的形态与交互样式：圆形与胶囊两态、波形动画与按钮行为 */
.bubble {
  position: fixed;
  left: 0;
  top: 0;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: transparent;
  transition: width 220ms ease-in-out, height 180ms ease-in-out, border-radius 180ms ease-in-out;
  transform-origin: left bottom;
  user-select: none;
  z-index: 9999;
}

.bubble.expanded {
  width: 130px;
  height: 48px;
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
  position: relative;
  -webkit-app-region: drag;
}

.bubble-pill {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: rgba(6, 10, 19, 0.98);
  box-shadow: none;
  -webkit-app-region: drag;
  
}

.wave {
  width: 40px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2.6px;
  position: relative;
  z-index: 2;
  -webkit-app-region: no-drag;
  cursor: pointer;
}

.bubble.expanded .wave {
  position: absolute;
  left: 2px;
  top: 50%;
  transform: translateY(-50%);
}
/* 收起态：利用父容器的 flex 居中，无需绝对定位 */
.bubble-circle .wave { position: relative; transform: none; }

.wave-svg { width: 16px; height: 13px; object-fit: contain; filter: drop-shadow(0 0 0 rgba(0,0,0,0)); }
.wave-svg.expanded { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); }

.bar {
  width: .6px;
  border-radius: 999px;
  background: #00ff66;
  transform-origin: center;
  display: block;
  flex: 0 0 auto;
}
 


/* 移除左右漂移，避免布局重排引起的抖动 */

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
  background: transparent;
  color: #ffffff;
  border-radius: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 200ms ease-out;
  -webkit-app-region: no-drag;
}

.open:hover { transform: translateY(-50%) scale(1.1); }
.open:active { transform: translateY(-50%) scale(0.95); }
 .open-icon { display: block; width: 18px; height: 18px; shape-rendering: geometricPrecision; }
</style>
