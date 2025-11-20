const { app, BrowserWindow, ipcMain, screen, globalShortcut } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')

let mainWindow = null
let bubbleWindow = null
let captureProc = null

const getLoadUrl = () => {
  const devUrl = process.env.VITE_DEV_SERVER_URL
  return devUrl || `file://${path.join(__dirname, '..', 'dist', 'index.html')}`
}

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    show: false,
    useContentSize: true,
    backgroundColor: '#ffffff',
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })
  const url = getLoadUrl()
  if (url.startsWith('http')) mainWindow.loadURL(url + '#main')
  else mainWindow.loadURL(`file://${path.join(__dirname, '..', 'dist', 'index.html')}#main`)
  mainWindow.once('ready-to-show', () => { try { mainWindow.show(); mainWindow.focus() } catch {} })
}

const createBubbleWindow = () => {
  bubbleWindow = new BrowserWindow({
    width: 48,
    height: 48,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })
  const url = getLoadUrl()
  if (url.startsWith('http')) bubbleWindow.loadURL(url + '#bubble')
  else bubbleWindow.loadURL(`file://${path.join(__dirname, '..', 'dist', 'index.html')}#bubble`)
  bubbleWindow.once('ready-to-show', () => { try { bubbleWindow.show() } catch {} })
}

const snapAndClampBubble = () => {
  try {
    if (!bubbleWindow) return
    const b = bubbleWindow.getBounds()
    const d = screen.getDisplayNearestPoint({ x: b.x + Math.floor(b.width / 2), y: b.y + Math.floor(b.height / 2) })
    const bounds = d?.bounds || { x: 0, y: 0, width: screen.getPrimaryDisplay().bounds.width, height: screen.getPrimaryDisplay().bounds.height }
    let nx = Math.min(Math.max(bounds.x, b.x), bounds.x + bounds.width - b.width)
    let ny = Math.min(Math.max(bounds.y, b.y), bounds.y + bounds.height - b.height)
    const SNAP = 12
    if (Math.abs(nx - bounds.x) < SNAP) nx = bounds.x
    if (Math.abs((bounds.x + bounds.width - b.width) - nx) < SNAP) nx = bounds.x + bounds.width - b.width
    if (Math.abs(ny - bounds.y) < SNAP) ny = bounds.y
    if (Math.abs((bounds.y + bounds.height - b.height) - ny) < SNAP) ny = bounds.y + bounds.height - b.height
    bubbleWindow.setPosition(Math.floor(nx), Math.floor(ny))
  } catch (e) { console.error('snapAndClampBubble failed', e) }
}

const resolveSidecar = () => {
  const prod = path.join(process.resourcesPath || path.join(__dirname, '..'), 'wasapi-capture.exe')
  const devRelease = path.join(__dirname, '..', 'sidecar-wasapi', 'target', 'release', 'sidecar-wasapi.exe')
  const devDebug = path.join(__dirname, '..', 'sidecar-wasapi', 'target', 'debug', 'sidecar-wasapi.exe')
  if (fs.existsSync(prod)) return prod
  if (fs.existsSync(devRelease)) return devRelease
  if (fs.existsSync(devDebug)) return devDebug
  return devRelease
}

ipcMain.handle('start-system-capture', async () => {
  try {
    if (captureProc) return { ok: true }
    const exe = resolveSidecar()
    if (!fs.existsSync(exe)) {
      console.error('Sidecar executable not found:', exe)
      return { ok: false, reason: 'missing-exe', path: exe }
    }
    captureProc = spawn(exe, [], { stdio: ['ignore','pipe','pipe'], windowsHide: true })
    captureProc.on('exit', (code, signal) => { console.log('Sidecar exited', { code, signal }); captureProc = null })
    captureProc.on('error', (err) => { console.error('Sidecar spawn error:', err); captureProc = null })
    if (captureProc.stdout) captureProc.stdout.on('data', (d) => { console.log('[sidecar]', d.toString().trim()) })
    if (captureProc.stderr) captureProc.stderr.on('data', (d) => { console.error('[sidecar-err]', d.toString().trim()) })
    return { ok: true, pid: captureProc.pid }
  } catch (e) {
    console.error('start-system-capture failed', e)
    return { ok: false, reason: 'spawn-error', error: String(e) }
  }
})

ipcMain.handle('stop-system-capture', async () => {
  try {
    if (captureProc) {
      captureProc.kill('SIGTERM')
      captureProc = null
    }
    return { ok: true }
  } catch (e) {
    console.error('stop-system-capture failed', e)
    return { ok: false, error: String(e) }
  }
})

ipcMain.handle('bubble-set-size', async (_evt, w, h) => {
  try { if (bubbleWindow) bubbleWindow.setSize(Math.floor(w), Math.floor(h)) } catch (e) { console.error(e) }
})
ipcMain.handle('bubble-set-position', async (_evt, x, y) => {
  try { if (bubbleWindow) bubbleWindow.setPosition(Math.floor(x), Math.floor(y)) } catch (e) { console.error(e) }
})
ipcMain.handle('bubble-get-position', async () => {
  try { if (bubbleWindow) { const b = bubbleWindow.getBounds(); return { x: b.x, y: b.y } } } catch (e) { console.error(e) }
  return null
})
ipcMain.handle('bubble-set-ignore', async (_evt, ignore) => {
  try { if (bubbleWindow) bubbleWindow.setIgnoreMouseEvents(!!ignore, { forward: true }) } catch (e) { console.error(e) }
})
ipcMain.handle('bubble-get-display-bounds', async () => {
  try {
    const d = screen.getPrimaryDisplay()
    return { width: d.bounds.width, height: d.bounds.height, scaleFactor: d.scaleFactor }
  } catch (e) {
    console.error(e)
    return null
  }
})
ipcMain.handle('show-bubble-window', async (_evt, animating) => {
  try {
    if (!bubbleWindow) createBubbleWindow()
    bubbleWindow.show(); bubbleWindow.focus()
    if (mainWindow) mainWindow.hide()
    try { bubbleWindow.webContents.send('bubble-animating', !!animating) } catch {}
    try { bubbleWindow.webContents.send('bubble-set-expanded', false) } catch {}
    snapAndClampBubble()
    return { ok: true }
  } catch (e) {
    console.error('show-bubble-window failed', e)
    return { ok: false, error: String(e) }
  }
})
ipcMain.handle('bubble-set-animating', async (_evt, animating) => {
  try { if (bubbleWindow) bubbleWindow.webContents.send('bubble-animating', !!animating); return { ok: true } } catch (e) { console.error(e); return { ok: false } }
})
ipcMain.handle('open-main-window', async () => {
  try {
    if (!mainWindow) createMainWindow()
    mainWindow.show(); mainWindow.focus()
    if (bubbleWindow) bubbleWindow.hide()
    return { ok: true }
  } catch (e) {
    console.error('open-main-window failed', e)
    return { ok: false, error: String(e) }
  }
})

app.whenReady().then(() => {
  createBubbleWindow()
  try {
    globalShortcut.register('Alt+Z', () => {
      try {
        if (mainWindow && mainWindow.isVisible()) {
          if (!bubbleWindow) createBubbleWindow()
          bubbleWindow.show(); bubbleWindow.focus()
          mainWindow.hide()
          try { bubbleWindow.webContents.send('bubble-set-expanded', false) } catch {}
          snapAndClampBubble()
        } else {
          if (!mainWindow) createMainWindow()
          mainWindow.show(); mainWindow.focus()
          if (bubbleWindow) bubbleWindow.hide()
        }
      } catch (e) { console.error('globalShortcut Alt+Z failed', e) }
    })
  } catch (e) { console.error('register shortcut failed', e) }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createBubbleWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
app.on('will-quit', () => {
  try { globalShortcut.unregisterAll() } catch {}
})

// 窗口控制 IPC
ipcMain.handle('window-minimize', async () => {
  try { if (mainWindow) mainWindow.minimize(); return { ok: true } } catch (e) { console.error('window-minimize failed', e); return { ok: false, error: String(e) } }
})
ipcMain.handle('window-close', async () => {
  try { if (mainWindow) mainWindow.close(); return { ok: true } } catch (e) { console.error('window-close failed', e); return { ok: false, error: String(e) } }
})
