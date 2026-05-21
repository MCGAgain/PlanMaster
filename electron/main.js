const { app, BrowserWindow, shell, ipcMain } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const net = require('net')

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

// Start Flask backend
function startFlask() {
  return new Promise((resolve, reject) => {
    // Find Python executable
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'

    // Get the app path
    const appPath = app.getAppPath()

    // Flask app entry point
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

    flaskProcess.stdout.on('data', (data) => {
      console.log(`Flask stdout: ${data}`)
    })

    flaskProcess.stderr.on('data', (data) => {
      console.log(`Flask stderr: ${data}`)
    })

    flaskProcess.on('error', (error) => {
      console.error('Flask process error:', error)
      reject(error)
    })

    flaskProcess.on('exit', (code) => {
      console.log(`Flask process exited with code ${code}`)
      flaskProcess = null
    })

    // Wait for Flask to be ready
    waitForFlask(FLASK_PORT)
      .then(() => resolve())
      .catch(reject)
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
    icon: path.join(__dirname, '..', 'static', 'icon.png'),
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
