<template>
  <!-- 悬浮球窗口容器，仅承载悬浮球组件 -->
  <div class="bubble-container">
    <FloatingBubble />
  </div>
  
</template>

<script setup lang="ts">
// 作用：配置一个透明、置顶、可穿透的悬浮小窗
// 行为：
// - 启动时尝试恢复上次拖拽保存的位置，否则放置在屏幕右下角
// - 监听悬浮球展开事件以控制是否忽略鼠标（穿透效果）
import { onMounted } from 'vue'
import { currentMonitor, primaryMonitor, getCurrentWindow } from '@tauri-apps/api/window'
import { LogicalSize, PhysicalPosition } from '@tauri-apps/api/dpi'
import FloatingBubble from '../components/FloatingBubble.vue'
import { listen } from '@tauri-apps/api/event'

onMounted(async () => {
  const win = getCurrentWindow()
  try { await win.hide() } catch {}
  await win.setResizable(false)
  await win.setDecorations(false)
  await win.setAlwaysOnTop(true)

  // 使 Webview 背景透明，并在显示完成后再显现，避免闪烁
  if (typeof document !== 'undefined') {
    document.body.classList.add('bubble-mode')
    document.body.style.background = 'transparent'
    document.documentElement.style.background = 'transparent'
    document.body.style.opacity = '0'
  }

  const diameter = 48
  const rightMargin = 16
  const bottomMargin = 120

  // 放置窗口：优先恢复历史位置，其次按当前主屏幕右下角计算
  const place = async () => {
    try {
      try {
        // 读取本地保存的物理坐标（由悬浮球组件在拖拽时保存）
        const saved = typeof localStorage !== 'undefined'
          ? localStorage.getItem('bubble:lastPos')
          : null
        console.log('Loaded saved position:', saved)
        if (saved) {
          const parsed = JSON.parse(saved)
          console.log('Parsed saved position:', parsed)
          if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            // 恢复历史位置：先设置窗口尺寸，再设置物理位置
            await win.setSize(new LogicalSize(diameter, diameter))
            console.log('Setting position to:', parsed.x, parsed.y)
            await win.setPosition(new PhysicalPosition(parsed.x, parsed.y))
            console.log('Position set successfully')
            await win.show()
            await win.setFocus()
            if (typeof document !== 'undefined') document.body.style.opacity = '1'
            return
          }
        }
      } catch (err) {
        console.error('Error loading saved position:', err)
      }
      let monitor = await currentMonitor()
      if (!monitor) monitor = await primaryMonitor()
      console.log('Monitor info:', monitor)
      const [w, h] = [diameter, diameter]
      await win.setSize(new LogicalSize(w, h))
      if (monitor) {
        const { size, scaleFactor } = monitor
        console.log('Scale factor:', scaleFactor)
        // 基于物理像素计算右下角位置，避免 DPI 缩放引起偏差
        const pxX = size.width - Math.round(w * scaleFactor) - Math.round(rightMargin * scaleFactor)
        const pxY = size.height - Math.round(h * scaleFactor) - Math.round(bottomMargin * scaleFactor)
        console.log('Calculated default position (physical):', pxX, pxY)
        try {
          await win.setPosition(new PhysicalPosition(pxX, pxY))
          console.log('Default position set successfully')
        } catch (err) {
          console.error('Error setting physical position:', err)
          // 某些环境下物理坐标设置可能失败，退回逻辑坐标计算
          const lw = size.width / scaleFactor
          const lh = size.height / scaleFactor
          const lx = lw - w - rightMargin
          const ly = lh - h - bottomMargin
          console.log('Fallback logical position:', lx, ly)
          await win.setPosition({ x: lx, y: ly })
          console.log('Fallback position set')
        }
        await win.show()
        await win.setFocus()
        if (typeof document !== 'undefined') document.body.style.opacity = '1'
      }
    } catch {}
  }

  setTimeout(place, 500)

  // 监听悬浮球展开状态来控制穿透（忽略鼠标事件）
  try {
    await listen('bubble-expand', async (event: any) => {
      console.log('Received bubble-expand event:', event.payload)
      const expanded = event.payload?.expanded || false
      try {
        await win.setIgnoreCursorEvents(false)
        console.log('Set ignoreCursorEvents to:', !expanded)
      } catch (err) {
        console.error('Error setting ignoreCursorEvents:', err)
      }
    })
  } catch (err) {
    console.error('Error listening to bubble-expand:', err)
  }
})

// 卸载时清理 bubble 模式样式，恢复正常页面背景与不透明度
import { onUnmounted } from 'vue'
onUnmounted(() => {
  try {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('bubble-mode')
      document.body.style.opacity = '1'
      document.body.style.background = ''
      document.documentElement.style.background = ''
    }
  } catch {}
})
</script>

<style scoped>
</style>
