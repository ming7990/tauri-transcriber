const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  startSystemCapture: () => ipcRenderer.invoke('start-system-capture'),
  stopSystemCapture: () => ipcRenderer.invoke('stop-system-capture'),
  bubble: {
    setSize: (w, h) => ipcRenderer.invoke('bubble-set-size', w, h),
    setPosition: (x, y) => ipcRenderer.invoke('bubble-set-position', x, y),
    getPosition: () => ipcRenderer.invoke('bubble-get-position'),
    setIgnoreMouse: (ignore) => ipcRenderer.invoke('bubble-set-ignore', ignore),
    getDisplayBounds: () => ipcRenderer.invoke('bubble-get-display-bounds'),
    openMain: () => ipcRenderer.invoke('open-main-window')
  }
})
