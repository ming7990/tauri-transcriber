<template>
  <div class="wizard-overlay" @click.self="$emit('close')">
    <div class="wizard-dialog glass">
      <h2>{{ title }}</h2>
      <div class="wizard-content">
        <div v-if="step === 'prompt'" class="step">
          <p>需要安装虚拟声卡以捕获扬声器声音</p>
          <p class="small">安装时间约 30 秒，无需重启系统</p>
          <p class="small">将下载并安装 VB-CABLE 虚拟音频设备</p>
          <div class="actions">
            <button @click="startInstall" class="btn active">开始安装</button>
            <button @click="$emit('close')" class="btn">取消</button>
          </div>
        </div>
        
        <div v-else-if="step === 'installing'" class="step">
          <div class="progress-bar">
            <div class="progress" :style="{ width: progress + '%' }"></div>
          </div>
          <p class="status-text">{{ statusText }}</p>
          <p class="small" v-if="statusText.includes('下载')">请耐心等待，文件大小约 1MB...</p>
          <p class="small" v-if="statusText.includes('安装')">安装过程中可能会弹出驱动安装确认窗口，请点击允许...</p>
        </div>
        
        <div v-else-if="step === 'success'" class="step">
          <p class="success">✓ 安装成功！</p>
          <p class="small">VB-CABLE 虚拟音频设备已安装完成</p>
          <button @click="$emit('installed')" class="btn active">开始使用</button>
        </div>
        
        <div v-else-if="step === 'error'" class="step">
          <p class="error">✗ 安装失败：{{ errorMsg }}</p>
          <p class="small">您可以尝试手动安装 VB-CABLE：</p>
          <p class="small">1. 访问 https://vb-audio.com/Cable/</p>
          <p class="small">2. 下载并安装 VB-CABLE 驱动</p>
          <div class="actions">
            <button @click="startInstall" class="btn">重试</button>
            <button @click="$emit('close')" class="btn">取消</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'

defineEmits(['close', 'installed'])

const step = ref<'prompt' | 'installing' | 'success' | 'error'>('prompt')
const progress = ref(0)
const statusText = ref('')
const errorMsg = ref('')
const title = ref('安装虚拟声卡')

const startInstall = async () => {
  step.value = 'installing'
  progress.value = 0
  statusText.value = '正在下载...'
  
  try {
    const result = await invoke<{success: boolean, error?: string}>('install_virtual_device')
    
    if (result.success) {
      progress.value = 100
      step.value = 'success'
    } else {
      step.value = 'error'
      errorMsg.value = result.error || '未知错误'
    }
  } catch (e: any) {
    step.value = 'error'
    errorMsg.value = e.toString()
  }
}
</script>

<style scoped>
.wizard-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.wizard-dialog {
  width: 400px;
  padding: 24px;
  -webkit-app-region: no-drag;
}

h2 {
  margin-bottom: 20px;
  font-size: 18px;
}

.wizard-content {
  min-height: 120px;
}

.step {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.small {
  font-size: 12px;
  color: var(--text-secondary);
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress {
  height: 100%;
  background: var(--accent);
  transition: width 0.3s;
}

.status-text {
  font-size: 14px;
  color: var(--text-secondary);
  text-align: center;
}

.success {
  color: #4ade80;
  font-size: 16px;
  text-align: center;
}

.error {
  color: #f87171;
  font-size: 14px;
}
</style>