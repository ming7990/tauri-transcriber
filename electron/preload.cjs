const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  startSystemCapture: () => ipcRenderer.invoke('start-system-capture'),
  stopSystemCapture: () => ipcRenderer.invoke('stop-system-capture'),
  window: {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    close: () => ipcRenderer.invoke('window-close')
  },
  bubble: {
    setSize: (w, h) => ipcRenderer.invoke('bubble-set-size', w, h),
    setPosition: (x, y) => ipcRenderer.invoke('bubble-set-position', x, y),
    getPosition: () => ipcRenderer.invoke('bubble-get-position'),
    setIgnoreMouse: (ignore) => ipcRenderer.invoke('bubble-set-ignore', ignore),
    getDisplayBounds: () => ipcRenderer.invoke('bubble-get-display-bounds'),
    openMain: () => ipcRenderer.invoke('open-main-window'),
    showBubble: (animating) => ipcRenderer.invoke('show-bubble-window', animating),
    setAnimating: (animating) => ipcRenderer.invoke('bubble-set-animating', animating),
    onAnimating: (callback) => { try { ipcRenderer.on('bubble-animating', (_e, state) => { try { callback(!!state) } catch {} }) } catch {} },
    onExpanded: (callback) => { try { ipcRenderer.on('bubble-set-expanded', (_e, state) => { try { callback(!!state) } catch {} }) } catch {} }
  }
})
