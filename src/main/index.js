import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { dbManager } from './database/dbManager.js'
import { printReceipt, testPrinter, loadPrinterConfig, savePrinterConfig } from './printer.js'
import { registerStatusListener, getOnlineStatus } from './database/sync.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    mainWindow.maximize()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the dev server URL in development, or local built index.html in production
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Single instance lock
const additionalData = { myKey: 'mandipalmas-pos-single-instance' }
const gotTheLock = app.requestSingleInstanceLock(additionalData)

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory, additionalData) => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    createWindow()

    // Database IPC Handlers
    ipcMain.handle('db:getMenu', async () => {
      return await dbManager.getMenu()
    })

    ipcMain.handle('db:createPedido', async (event, pedido) => {
      return await dbManager.createPedido(pedido)
    })

    ipcMain.handle('db:getPedidosHoy', async () => {
      return await dbManager.getPedidosHoy()
    })

    ipcMain.handle('db:getPedidosPorRango', async (event, desde, hasta) => {
      return await dbManager.getPedidosPorRango(desde, hasta)
    })

    ipcMain.handle('db:getMesas', async () => {
      return await dbManager.getMesas()
    })

    ipcMain.handle('db:updateMesa', async (event, id, estado, pedidoId) => {
      return await dbManager.updateMesa(id, estado, pedidoId)
    })

    ipcMain.handle('db:getInventario', async () => {
      return await dbManager.getInventario()
    })

    ipcMain.handle('db:updateStock', async (event, items) => {
      return await dbManager.updateStock(items)
    })

    ipcMain.handle('db:saveProducto', async (event, producto) => {
      return await dbManager.saveProducto(producto)
    })

    ipcMain.handle('db:deleteProducto', async (event, id) => {
      return await dbManager.deleteProducto(id)
    })

    // Printer IPC Handlers
    ipcMain.handle('printer:print', async (event, ticketData) => {
      return await printReceipt(ticketData)
    })

    ipcMain.handle('printer:testPrint', async () => {
      return await testPrinter()
    })

    ipcMain.handle('printer:getConfig', async () => {
      return loadPrinterConfig()
    })

    ipcMain.handle('printer:saveConfig', async (event, config) => {
      return savePrinterConfig(config)
    })

    // Network IPC Handlers
    ipcMain.handle('network:getPendingSync', async () => {
      return getOnlineStatus()
    })

    // Register Status Listener for Sync Notifications
    registerStatusListener((isOnline) => {
      const windows = BrowserWindow.getAllWindows()
      windows.forEach(win => {
        if (!win.webContents.isDestroyed()) {
          win.webContents.send('network:status', isOnline)
        }
      })
    })

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
