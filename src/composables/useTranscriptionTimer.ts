import { computed, onUnmounted, ref, watch } from 'vue'
import { useAudioStore } from '../stores/audioStore'

export function useTranscriptionTimer() {
  const audioStore = useAudioStore()
  const elapsed = ref(0)
  let timer: number | null = null

  const isTranscribing = computed(
    () => audioStore.isMicActive || audioStore.isSpeakerActive
  )

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
    audioStore,
    isTranscribing,
    elapsedLabel,
  }
}


