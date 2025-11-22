<template>
  <div class="confirm-overlay" v-if="props.open">
    <div class="confirm-card">
      <div class="confirm-header">
        <div class="confirm-title">{{ props.title }}</div>
      </div>
      <div class="confirm-msg">{{ props.content }}</div>
      <div class="confirm-actions">
        <button class="confirm-btn" @click="onCancel" :disabled="props.loading">{{ props.cancelText || '取消' }}</button>
        <button class="confirm-btn primary" @click="onConfirm" :disabled="props.loading">
          <span class="btn-inner" :class="{ 'with-gap': props.loading }">
            <span class="btn-spinner-left" :class="{ active: props.loading }"></span>
            <span class="btn-text">{{ props.confirmText || '确定' }}</span>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

const props = defineProps<{ open: boolean; title: string; content: string; cancelText?: string; confirmText?: string; loading?: boolean }>()
const emit = defineEmits<{ (e: 'cancel'): void; (e: 'confirm'): void }>()

const onCancel = () => emit('cancel')
const onConfirm = () => emit('confirm')
</script>

<style scoped>
.confirm-overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: transparent; z-index: 999999 }
.confirm-card { position: relative; width: 360px; max-width: 90vw; padding: 16px 16px 48px; border-radius: 16px; backdrop-filter: blur(18px) saturate(180%); -webkit-backdrop-filter: blur(18px) saturate(180%); background: rgba(39,39,39,.90); border: 1px solid rgba(255,255,255,.3); transform: translateY(-100px) }
.confirm-header { margin: 0 -16px 12px; padding: 0 16px 8px; border-bottom: 1px solid rgba(255,255,255,.1) }
.confirm-title { font: 700 14px var(--font-sans, system-ui); color: rgba(255,255,255,.95); margin: 0 }
.confirm-msg { font: 400 13px var(--font-sans, system-ui); color: rgba(255,255,255,.85); margin-bottom: 12px }
.confirm-actions { position: absolute; right: 12px; bottom: 12px; display: flex; gap: 8px }
.confirm-btn { min-width: 64px; height: 28px; padding: 0 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,.2); background: transparent; color: rgba(255,255,255,.9); display: inline-flex; align-items: center; justify-content: center; gap: 6px; position: relative; line-height: 1 }
.confirm-btn.primary { background: rgba(255,0,0,.6); border-color: rgba(255,255,255,.2); color: #fff }
.confirm-btn[disabled] { opacity: .6; pointer-events: none }
.btn-inner { display: inline-flex; align-items: center; justify-content: center; height: 100%; gap: 0 }
.btn-inner.with-gap { gap: 8px }
.btn-text { display: inline-flex; align-items: center; justify-content: center; height: 100%; line-height: 1 }
.btn-spinner-left { width: 0; height: 14px; display: inline-flex; align-items: center; justify-content: center; opacity: 0; transition: width .2s ease, opacity .2s ease }
.btn-spinner-left::after { content: ''; width: 14px; height: 14px; display: block; border-radius: 50%; background: conic-gradient(from 0deg, rgba(255,255,255,.95) 0deg 120deg, rgba(230,230,230,.25) 120deg 360deg); -webkit-mask: radial-gradient(farthest-side, #0000 calc(100% - 2px), #000 0); mask: radial-gradient(farthest-side, #0000 calc(100% - 2px), #000 0); animation: spin .8s linear infinite }
.btn-spinner-left.active { width: 14px; opacity: 1 }
@keyframes spin { to { transform: rotate(360deg) } }
</style>