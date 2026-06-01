import { sqliteOperations, initSqlite } from './sqlite.js'
import { supabaseOperations } from './supabase.js'
import { getOnlineStatus, startConnectionMonitoring, triggerSync } from './sync.js'

// Initialize local SQLite
initSqlite()

// Start checking connections
startConnectionMonitoring()

export const dbManager = {
  getMenu: async () => {
    if (getOnlineStatus()) {
      try {
        console.log('Fetching menu from Supabase... ☁️')
        const categorias = await supabaseOperations.getCategorias()
        const productos = await supabaseOperations.getProductos()
        
        if (categorias && productos) {
          return { categorias, productos }
        }
      } catch (err) {
        console.error('Failed to get menu from Supabase, falling back to local SQLite:', err)
      }
    }
    
    console.log('Fetching menu from local SQLite... 💾')
    return {
      categorias: sqliteOperations.getCategorias(),
      productos: sqliteOperations.getProductos()
    }
  },

  saveProducto: async (producto) => {
    // Always save to SQLite first as immediate local cache
    const localId = sqliteOperations.saveProducto(producto)
    
    if (getOnlineStatus()) {
      try {
        const cloudId = await supabaseOperations.saveProducto(producto)
        if (cloudId) {
          sqliteOperations.marcarSincronizado('productos', localId)
          return { id: cloudId, source: 'supabase' }
        }
      } catch (err) {
        console.error('Failed to save product to Supabase, marked as pending local sync:', err)
      }
    }
    
    return { id: localId, source: 'sqlite' }
  },

  deleteProducto: async (id) => {
    sqliteOperations.deleteProducto(id)
    
    if (getOnlineStatus()) {
      try {
        const success = await supabaseOperations.deleteProducto(id)
        if (success) {
          sqliteOperations.marcarSincronizado('productos', id)
          return true
        }
      } catch (err) {
        console.error('Failed to delete product from Supabase, marked as pending local sync:', err)
      }
    }
    return true
  },

  getMesas: async () => {
    if (getOnlineStatus()) {
      try {
        const mesas = await supabaseOperations.getMesas()
        if (mesas) return mesas
      } catch (err) {
        console.error('Failed to get mesas from Supabase, falling back to local SQLite:', err)
      }
    }
    return sqliteOperations.getMesas()
  },

  updateMesa: async (id, estado, pedidoId, horaOcupacion = null) => {
    sqliteOperations.updateMesa(id, estado, pedidoId, horaOcupacion)
    
    if (getOnlineStatus()) {
      try {
        const success = await supabaseOperations.updateMesa(id, estado, pedidoId, horaOcupacion)
        if (success) {
          sqliteOperations.marcarSincronizado('mesas', id)
          return true
        }
      } catch (err) {
        console.error('Failed to update mesa in Supabase, marked as pending local sync:', err)
      }
    }
    return true
  },

  createPedido: async (pedido) => {
    // Always insert locally first to avoid delay
    const localId = sqliteOperations.createPedido(pedido)
    
    if (getOnlineStatus()) {
      try {
        const cloudId = await supabaseOperations.createPedido(pedido)
        if (cloudId) {
          sqliteOperations.marcarSincronizado('pedidos', localId)
          return { id: cloudId, source: 'supabase' }
        }
      } catch (err) {
        console.error('Failed to upload order to Supabase, marked as pending local sync:', err)
      }
    }
    
    return { id: localId, source: 'sqlite' }
  },

  getPedidosHoy: async () => {
    if (getOnlineStatus()) {
      try {
        const peds = await supabaseOperations.getPedidosHoy()
        if (peds) return peds
      } catch (err) {
        console.error('Failed to fetch today\'s orders from Supabase, falling back to local SQLite:', err)
      }
    }
    return sqliteOperations.getPedidosHoy()
  },

  getPedidosPorRango: async (desde, hasta) => {
    if (getOnlineStatus()) {
      try {
        const peds = await supabaseOperations.getPedidosPorRango(desde, hasta)
        if (peds) return peds
      } catch (err) {
        console.error('Failed to fetch orders by range from Supabase, falling back to local SQLite:', err)
      }
    }
    return sqliteOperations.getPedidosPorRango(desde, hasta)
  },

  getInventario: async () => {
    if (getOnlineStatus()) {
      try {
        const inv = await supabaseOperations.getInventario()
        if (inv) return inv
      } catch (err) {
        console.error('Failed to fetch inventory from Supabase, falling back to local SQLite:', err)
      }
    }
    return sqliteOperations.getInventario()
  },

  updateStock: async (items) => {
    // items is array of { id, cantidad }
    for (const item of items) {
      sqliteOperations.updateInventarioStock(item.id, item.cantidad)
      if (getOnlineStatus()) {
        try {
          const success = await supabaseOperations.updateInventarioStock(item.id, item.cantidad)
          if (success) {
            sqliteOperations.marcarSincronizado('inventario', item.id)
          }
        } catch (err) {
          console.error(`Failed to update inventory item ${item.id} to Supabase, marked pending:`, err)
        }
      }
    }
    return true
  }
}
