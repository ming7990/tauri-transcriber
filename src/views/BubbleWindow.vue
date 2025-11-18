<template>
  <!-- 悬浮球窗口容器，仅承载悬浮球组件 -->
  <div class="bubble-container">
    <FloatingBubble />
  </div>
  
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import FloatingBubble from '../components/FloatingBubble.vue'

onMounted(async () => {
  if (typeof document !== 'undefined') {
    document.body.classList.add('bubble-mode')
    document.body.style.background = 'transparent'
    document.documentElement.style.background = 'transparent'
    document.body.style.opacity = '0'
  }

  const diameter = 48
  const rightMargin = 100
  const bottomMargin = 200

  const place = async () => {
    try {
      try {
        const saved = typeof localStorage !== 'undefined'
          ? localStorage.getItem('bubble:lastPos')
          : null
        console.log('Loaded saved position:', saved)
        if (saved) {
          const parsed = JSON.parse(saved)
          console.log('Parsed saved position:', parsed)
          if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            const api = (window as any).api
            await api.bubble.setSize(diameter, diameter)
            await api.bubble.setPosition(parsed.x, parsed.y)
            console.log('Position set successfully')
            if (typeof document !== 'undefined') document.body.style.opacity = '1'
            return
          }
        }
      } catch (err) {
        console.error('Error loading saved position:', err)
      }
      const api = (window as any).api
      const [w, h] = [diameter, diameter]
      await api.bubble.setSize(w, h)
      try {
        const bounds = await api.bubble.getDisplayBounds()
        const pxX = bounds ? bounds.width - w - rightMargin : 800 - w - rightMargin
        const pxY = bounds ? bounds.height - h - bottomMargin : 600 - h - bottomMargin
        await api.bubble.setPosition(pxX, pxY)
        if (typeof document !== 'undefined') document.body.style.opacity = '1'
      } catch {}
    } catch {}
  }

  setTimeout(place, 500)
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
