const { app, BrowserWindow, ipcMain, screen } = require('electron')
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
    show: true,
    backgroundColor: '#ffffff',
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
}

const createBubbleWindow = () => {
  bubbleWindow = new BrowserWindow({
    width: 48,
    height: 48,
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
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createBubbleWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
