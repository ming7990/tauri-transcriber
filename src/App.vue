<template>
  <component :is="mode === 'bubble' ? BubbleAsync : MainAsync" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, h, defineAsyncComponent } from 'vue'
const Skeleton = { render: () => h('div', { style: { width: '100%', height: '100%' } }) }
const BubbleAsync = defineAsyncComponent({ loader: () => import('./views/BubbleWindow.vue'), loadingComponent: Skeleton })
const MainAsync = defineAsyncComponent({ loader: () => import('./views/MainWindow.vue'), loadingComponent: Skeleton })

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


