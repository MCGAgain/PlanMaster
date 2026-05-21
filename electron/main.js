const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron')
const { spawn, execFile } = require('child_process')
const path = require('path')
const net = require('net')
const fs = require('fs')

// Flask backend configuration
const FLASK_PORT = 8080
const FLASK_HOST = '127.0.0.1'
const FLASK_URL = `http://${FLASK_HOST}:${FLASK_PORT}`

let mainWindow = null
let flaskProcess = null

// Check if port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.listen(port, FLASK_HOST, () => {
      server.close(() => resolve(true))
    })
    server.on('error', () => resolve(false))
  })
}

// Wait for Flask to be ready
function waitForFlask(port, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()

    function check() {
      const socket = new net.Socket()
      socket.setTimeout(100)

      socket.on('connect', () => {
        socket.destroy()
        resolve(true)
      })

      socket.on('timeout', () => {
        socket.destroy()
        if (Date.now() - startTime > timeout) {
          reject(new Error('Flask startup timeout'))
        } else {
          setTimeout(check, 100)
        }
      })

      socket.on('error', () => {
        socket.destroy()
        if (Date.now() - startTime > timeout) {
          reject(new Error('Flask startup timeout'))
        } else {
          setTimeout(check, 100)
        }
      })

      socket.connect(port, FLASK_HOST)
    }

    check()
  })
}

// Get the backend executable path
function getBackendPath() {
  const isPackaged = app.isPackaged
  const platform = process.platform

  console.log('isPackaged:', isPackaged)
  console.log('platform:', platform)
  console.log('app.getPath("exe"):', app.getPath('exe'))
  console.log('process.resourcesPath:', process.resourcesPath)

  if (isPackaged) {
    // In packaged app, backend is in resources
    const resourcesPath = process.resourcesPath
    let backendPath

    if (platform === 'win32') {
      backendPath = path.join(resourcesPath, 'backend', 'PlanMaster-Backend.exe')
    } else {
      backendPath = path.join(resourcesPath, 'backend', 'PlanMaster-Backend')
    }

    console.log('Looking for backend at:', backendPath)
    console.log('Backend exists:', fs.existsSync(backendPath))

    // List backend directory contents
    const backendDir = path.join(resourcesPath, 'backend')
    if (fs.existsSync(backendDir)) {
      console.log('Backend directory contents:', fs.readdirSync(backendDir))
    } else {
      console.log('Backend directory does not exist:', backendDir)
      // Try alternative path
      const altDir = path.join(resourcesPath, 'app', 'backend')
      if (fs.existsSync(altDir)) {
        console.log('Found backend at alternative path:', altDir)
        return path.join(altDir, platform === 'win32' ? 'PlanMaster-Backend.exe' : 'PlanMaster-Backend')
      }
    }

    return backendPath
  } else {
    // In development, use PyInstaller output or Python directly
    const distBackend = path.join(__dirname, '..', 'dist', 'PlanMaster-Backend')
    const distBackendExe = path.join(__dirname, '..', 'dist', 'PlanMaster-Backend.exe')

    if (fs.existsSync(distBackend)) {
      return distBackend
    } else if (fs.existsSync(distBackendExe)) {
      return distBackendExe
    } else {
      // Fallback to Python
      return null
    }
  }
}

// Start Flask backend
function startFlask() {
  return new Promise((resolve, reject) => {
    const backendPath = getBackendPath()
    const appPath = app.getAppPath()

    if (backendPath && fs.existsSync(backendPath)) {
      // Use bundled backend
      console.log(`Starting bundled backend: ${backendPath}`)

      // Make sure the backend is executable
      try {
        fs.chmodSync(backendPath, '755')
      } catch (e) {
        console.log('Could not chmod backend:', e.message)
      }

      flaskProcess = spawn(backendPath, [], {
        cwd: path.dirname(backendPath),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          FLASK_PORT: FLASK_PORT.toString(),
          ELECTRON_MODE: 'true'
        }
      })
    } else {
      // Fallback to Python (development mode)
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
      const flaskApp = path.join(appPath, 'app.py')

      console.log(`Starting Flask backend: ${pythonCmd} ${flaskApp}`)

      flaskProcess = spawn(pythonCmd, [flaskApp], {
        cwd: appPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ELECTRON_MODE: 'true',
          FLASK_PORT: FLASK_PORT.toString()
        }
      })
    }

    let stdoutData = ''
    let stderrData = ''

    flaskProcess.stdout.on('data', (data) => {
      const msg = data.toString()
      console.log(`Flask stdout: ${msg}`)
      stdoutData += msg
    })

    flaskProcess.stderr.on('data', (data) => {
      const msg = data.toString()
      console.log(`Flask stderr: ${msg}`)
      stderrData += msg
    })

    flaskProcess.on('error', (error) => {
      console.error('Flask process error:', error)
      reject(error)
    })

    flaskProcess.on('exit', (code, signal) => {
      console.log(`Flask process exited with code ${code}, signal ${signal}`)
      console.log('Flask stdout:', stdoutData)
      console.log('Flask stderr:', stderrData)
      flaskProcess = null
    })

    // Wait for Flask to be ready
    waitForFlask(FLASK_PORT)
      .then(() => resolve())
      .catch((err) => {
        console.error('Flask failed to start:', err)
        console.error('Flask stdout:', stdoutData)
        console.error('Flask stderr:', stderrData)
        reject(err)
      })
  })
}

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'PlanMaster - 计划管理',
    icon: path.join(__dirname, '..', 'static', 'icon.jpg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: false,
      spellcheck: false
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#f0eef8',
    show: false
  })

  // Load Flask URL
  mainWindow.loadURL(FLASK_URL)

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()

    // Focus window
    if (process.platform === 'darwin') {
      app.dock.show()
    }
    mainWindow.focus()
  })

  // Handle load errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription)
  })

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // Handle navigation
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Allow navigation within Flask
    if (!url.startsWith(FLASK_URL)) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  // Window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools()
  }
}

// App lifecycle
app.whenReady().then(async () => {
  try {
    // Start Flask backend
    console.log('Starting Flask backend...')
    await startFlask()
    console.log('Flask backend ready')

    // Create window
    createWindow()

    // Handle app activation (macOS)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  } catch (error) {
    console.error('Failed to start:', error)

    // Show error dialog
    dialog.showErrorBox(
      '启动失败',
      `PlanMaster 启动失败:\n\n${error.message}\n\n请检查应用是否完整安装。`
    )

    app.quit()
  }
})

// Quit when all windows closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Cleanup before quit
app.on('before-quit', () => {
  if (flaskProcess) {
    console.log('Stopping Flask backend...')
    flaskProcess.kill()
    flaskProcess = null
  }
})

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('get-platform', () => {
  return process.platform
})

ipcMain.handle('is-electron', () => {
  return true
})
