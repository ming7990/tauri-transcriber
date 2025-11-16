import { Ref, computed, onUnmounted, ref, watch } from 'vue'

/**
 * 录制计时逻辑：根据 isTranscribing 自动启动/停止计时，并返回格式化后的时间字符串。
 */
export function useRecordingTimer(isTranscribing: Ref<boolean>) {
  const elapsed = ref(0)
  let timer: number | null = null

  const elapsedLabel = computed(() => {
    const minutes = String(Math.floor(elapsed.value / 60)).padStart(2, '0')
    const seconds = String(elapsed.value % 60).padStart(2, '0')
    return `${minutes}:${seconds}`
  })

  watch(
    isTranscribing,
    (active) => {
      if (active && timer === null) {
        const startedAt = Date.now()
        timer = window.setInterval(() => {
          elapsed.value = Math.floor((Date.now() - startedAt) / 1000)
        }, 1000)
      } else if (!active && timer !== null) {
        window.clearInterval(timer)
        timer = null
        elapsed.value = 0
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    if (timer !== null) {
      window.clearInterval(timer)
    }
  })

  return {
    elapsed,
    elapsedLabel
  }
}


