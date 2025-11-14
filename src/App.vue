<template>
  <!-- 入口文件：根据 URL hash 选择渲染哪个“根组件” -->
  <BubbleWindow v-if="mode === 'bubble'" />
  <MainWindow v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BubbleWindow from './views/BubbleWindow.vue'
import MainWindow from './views/MainWindow.vue'

const mode = computed<'bubble' | 'main'>(() => {
  if (typeof window === 'undefined') return 'bubble'
  return window.location.hash === '#main' ? 'main' : 'bubble'
})
</script>

<style scoped>
/* 入口不负责布局，具体布局交给各自的根组件 */
</style>


