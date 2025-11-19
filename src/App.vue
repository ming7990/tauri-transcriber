<template>
  <BubbleWindow v-if="mode === 'bubble'" />
  <MainWindow v-else />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import BubbleWindow from './views/BubbleWindow.vue'
import MainWindow from './views/MainWindow.vue'

const mode = ref<'bubble' | 'main'>('main')

const updateMode = () => {
  const hasElectronBubble = typeof window !== 'undefined' && (window as any).api?.bubble
  const h = typeof window !== 'undefined' ? window.location.hash : ''
  if (h === '#bubble' && hasElectronBubble) {
    mode.value = 'bubble'
  } else {
    mode.value = 'main'
  }
}

onMounted(() => {
  updateMode()
  if (typeof window !== 'undefined') {
    window.addEventListener('hashchange', updateMode)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('hashchange', updateMode)
  }
})

</script>

<style scoped>
/* 入口不负责布局，窗口布局由各视图组件完成 */
</style>


