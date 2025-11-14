<template>
  <div
    class="bubble-shell draggable"
    @mouseenter="hover = true"
    @mouseleave="hover = false"
  >
    <div
      class="bubble-core no-drag"
      :class="{ 'bubble-expanded': expanded || hover }"
    >
      <!-- 收起状态：只显示小球 -->
      <div v-if="!expanded && !hover" class="bubble-collapsed">
        <div class="wave-wrapper" :class="{ active: isTranscribing }">
          <span class="wave-bar" v-for="n in 4" :key="n" />
        </div>
        <span class="bubble-time-small" v-if="hasTime">
          {{ elapsedLabel }}
        </span>
        <span class="bubble-idle-small" v-else>
          待机
        </span>
      </div>
      
      <!-- 展开状态：左侧波浪、中间时间、右侧图标 -->
      <div v-else class="bubble-expanded-content">
        <div class="wave-wrapper" :class="{ active: isTranscribing }">
          <span class="wave-bar" v-for="n in 4" :key="n" />
        </div>
        <span class="bubble-time" v-if="hasTime">
          {{ elapsedLabel }}
        </span>
        <span class="bubble-idle" v-else>
          待机
        </span>
        <button
          class="bubble-icon-btn"
          @click.stop="emit('open-main')"
          title="打开转录"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  isTranscribing: boolean
  elapsedLabel: string
  expanded: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-expand'): void
  (e: 'open-main'): void
}>()

const hover = ref(false)

const hasTime = computed(() => props.elapsedLabel !== '00:00')
</script>

<style scoped>
.bubble-shell {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bubble-core {
  width: 72px;
  height: 72px;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 20%, #35fce0, #047857 60%, #022c22);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.45);
  padding: 6px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.bubble-expanded {
  width: 240px;
  height: 72px;
  border-radius: 999px;
}

.bubble-collapsed {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.bubble-expanded-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(6, 78, 59, 0.95);
}

.wave-wrapper {
  width: 22px;
  height: 14px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.wave-bar {
  width: 3px;
  height: 4px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.7);
  transform-origin: bottom;
  transition: height 0.25s ease;
}

.wave-wrapper.active .wave-bar:nth-child(1) {
  animation: wave 0.8s ease-in-out infinite;
}
.wave-wrapper.active .wave-bar:nth-child(2) {
  animation: wave 0.8s ease-in-out infinite 0.1s;
}
.wave-wrapper.active .wave-bar:nth-child(3) {
  animation: wave 0.8s ease-in-out infinite 0.2s;
}
.wave-wrapper.active .wave-bar:nth-child(4) {
  animation: wave 0.8s ease-in-out infinite 0.3s;
}

@keyframes wave {
  0%,
  100% {
    height: 4px;
  }
  50% {
    height: 14px;
  }
}

.bubble-time {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #e5fdf5;
  min-width: 45px;
  text-align: center;
}

.bubble-time-small {
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  color: #e5fdf5;
}

.bubble-idle {
  font-size: 13px;
  color: rgba(226, 232, 240, 0.8);
  min-width: 45px;
  text-align: center;
}

.bubble-idle-small {
  font-size: 10px;
  color: rgba(226, 232, 240, 0.7);
}

.bubble-icon-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(16, 185, 129, 0.2);
  color: #bbf7d0;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.bubble-icon-btn:hover {
  background: rgba(16, 185, 129, 0.35);
  transform: scale(1.1);
}

.bubble-icon-btn:active {
  transform: scale(0.95);
}
</style>


