import { contextBridge, ipcRenderer } from 'electron'

// Expose secure APIs to the React renderer
contextBridge.exposeInMainWorld('api', {
  db: {
    getMenu: () => ipcRenderer.invoke('db:getMenu'),
    createPedido: (pedido) => ipcRenderer.invoke('db:createPedido', pedido),
    getPedidosHoy: () => ipcRenderer.invoke('db:getPedidosHoy'),
    getPedidosPorRango: (desde, hasta) => ipcRenderer.invoke('db:getPedidosPorRango', desde, hasta),
    getMesas: () => ipcRenderer.invoke('db:getMesas'),
    updateMesa: (id, estado, pedidoId) => ipcRenderer.invoke('db:updateMesa', id, estado, pedidoId),
    getInventario: () => ipcRenderer.invoke('db:getInventario'),
    updateStock: (items) => ipcRenderer.invoke('db:updateStock', items),
    saveProducto: (producto) => ipcRenderer.invoke('db:saveProducto', producto),
    deleteProducto: (id) => ipcRenderer.invoke('db:deleteProducto', id)
  },
  printer: {
    print: (ticketData) => ipcRenderer.invoke('printer:print', ticketData),
    testPrint: () => ipcRenderer.invoke('printer:testPrint'),
    getConfig: () => ipcRenderer.invoke('printer:getConfig'),
    saveConfig: (config) => ipcRenderer.invoke('printer:saveConfig', config)
  },
  network: {
    isOnline: () => navigator.onLine,
    getPendingSync: () => ipcRenderer.invoke('network:getPendingSync')
  }
})
