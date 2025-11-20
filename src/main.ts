import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')

function loadIconfont(href: string, type: 'css' | 'js') {
  if (typeof document === 'undefined') return
  if (type === 'css') {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.onerror = () => {}
    document.head.appendChild(link)
  } else {
    const script = document.createElement('script')
    script.src = href
    script.defer = true
    script.onerror = () => {}
    document.head.appendChild(script)
  }
}

if (typeof window !== 'undefined') {
  const schedule = (fn: () => void) => {
    const ric = (window as any).requestIdleCallback
    if (typeof ric === 'function') ric(fn)
    else setTimeout(fn, 0)
  }
  schedule(() => loadIconfont('/iconfont/iconfont.js', 'js'))
}
