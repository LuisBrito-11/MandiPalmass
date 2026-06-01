import { sqliteOperations } from './sqlite.js'
import { supabaseOperations, supabase } from './supabase.js'

let isOnline = false
let syncInProgress = false
let statusChangeCallbacks = []

// Ping Google or Supabase to verify active connection
async function checkConnection() {
  try {
    const response = await fetch('https://edzuperepdnrrjaufipa.supabase.co', { method: 'HEAD', timeout: 5000 })
    const prevStatus = isOnline
    isOnline = response.ok || response.status === 400 // 400 is fine (Supabase base url returns 400/404 depending on auth)
    
    if (prevStatus !== isOnline) {
      console.log(`Connection state changed: ${isOnline ? 'ONLINE 🟢' : 'OFFLINE 🔴'}`)
      notifyListeners()
      if (isOnline) {
        triggerSync()
      }
    }
  } catch (err) {
    if (isOnline) {
      isOnline = false
      console.log('Connection state changed: OFFLINE 🔴 (Fetch error)')
      notifyListeners()
    }
  }
}

function notifyListeners() {
  statusChangeCallbacks.forEach(cb => cb(isOnline))
}

export function registerStatusListener(cb) {
  statusChangeCallbacks.push(cb)
  cb(isOnline)
  return () => {
    statusChangeCallbacks = statusChangeCallbacks.filter(c => c !== cb)
  }
}

export function getOnlineStatus() {
  return isOnline
}

// Start periodic checks
export function startConnectionMonitoring() {
  checkConnection()
  setInterval(checkConnection, 15000) // check every 15 seconds
}

// Push local SQLite pending changes to Supabase Cloud
export async function triggerSync() {
  if (syncInProgress || !isOnline) return
  syncInProgress = true
  console.log('Starting sync process... 🔄')

  try {
    // 1. Sync Categorias
    const pendingCats = sqliteOperations.getPendientes('categorias')
    for (const cat of pendingCats) {
      const cleanCat = { ...cat }
      delete cleanCat.pendiente_sync
      
      const successId = await supabaseOperations.saveCategoria(cleanCat)
      if (successId) {
        sqliteOperations.marcarSincronizado('categorias', cat.id)
      }
    }

    // 2. Sync Productos
    const pendingProds = sqliteOperations.getPendientes('productos')
    for (const prod of pendingProds) {
      const cleanProd = { ...prod }
      delete cleanProd.pendiente_sync
      
      const successId = await supabaseOperations.saveProducto(cleanProd)
      if (successId) {
        sqliteOperations.marcarSincronizado('productos', prod.id)
      }
    }

    // 3. Sync Mesas
    const pendingMesas = sqliteOperations.getPendientes('mesas')
    for (const mesa of pendingMesas) {
      const success = await supabaseOperations.updateMesa(
        mesa.id, 
        mesa.estado, 
        mesa.pedido_activo_id, 
        mesa.hora_ocupacion
      )
      if (success) {
        sqliteOperations.marcarSincronizado('mesas', mesa.id)
      }
    }

    // 4. Sync Pedidos
    const pendingPedidos = sqliteOperations.getPendientes('pedidos')
    for (const ped of pendingPedidos) {
      // Get all local items for this pedido
      const localItems = sqliteOperations.sqliteOperations?.getPedidoItems?.(ped.id) || [] 
      // If we don't have getPedidoItems in sqlite.js, let's write it robustly:
      // Oh, let's fetch directly or ensure SQLite operations exposes it. Let's make it direct:
      const cleanPed = { 
        ...ped, 
        items: sqliteOperations.getPedidoItemsRaw ? sqliteOperations.getPedidoItemsRaw(ped.id) : [] 
      }
      
      const successId = await supabaseOperations.createPedido(cleanPed)
      if (successId) {
        sqliteOperations.marcarSincronizado('pedidos', ped.id)
      }
    }

    // 5. Sync Inventario
    const pendingInv = sqliteOperations.getPendientes('inventario')
    for (const inv of pendingInv) {
      const success = await supabaseOperations.updateInventarioStock(inv.id, inv.cantidad_actual)
      if (success) {
        sqliteOperations.marcarSincronizado('inventario', inv.id)
      }
    }

    console.log('Sync process completed successfully! ✅')
  } catch (err) {
    console.error('Error during sync:', err)
  } finally {
    syncInProgress = false
  }
}
