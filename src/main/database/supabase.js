import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const SUPABASE_URL = 'https://edzuperepdnrrjaufipa.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkenVwZXJlcGRucnJqYXVmaXBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjQxNDAsImV4cCI6MjA5NTg0MDE0MH0.yzlzwcsLo0HnrYOaDE9fZHVtrkY6zeIpzYe0l-0vNiY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: {
    transport: ws
  }
})

// Suppress errors and handle network issues elegantly
async function safeQuery(callback) {
  try {
    const result = await callback()
    if (result.error) throw result.error
    return { data: result.data, error: null }
  } catch (error) {
    console.error('Supabase query failed:', error.message || error)
    return { data: null, error }
  }
}

export const supabaseOperations = {
  // Menu
  getCategorias: async () => {
    const { data, error } = await safeQuery(() =>
      supabase.from('categorias').select('*').eq('activa', true).order('orden')
    )
    return error ? null : data
  },
  getProductos: async () => {
    const { data, error } = await safeQuery(() =>
      supabase.from('productos').select('*').eq('activo', true)
    )
    return error ? null : data
  },
  saveCategoria: async (cat) => {
    const { data, error } = await safeQuery(() =>
      supabase.from('categorias').upsert(cat).select()
    )
    return error ? null : data[0]?.id
  },
  saveProducto: async (prod) => {
    const { data, error } = await safeQuery(() =>
      supabase.from('productos').upsert(prod).select()
    )
    return error ? null : data[0]?.id
  },
  deleteProducto: async (id) => {
    const { error } = await safeQuery(() =>
      supabase.from('productos').update({ activo: false }).eq('id', id)
    )
    return !error
  },

  // Mesas
  getMesas: async () => {
    const { data, error } = await safeQuery(() =>
      supabase.from('mesas').select('*').order('id')
    )
    return error ? null : data
  },
  updateMesa: async (id, estado, pedidoId, horaOcupacion = null) => {
    const { error } = await safeQuery(() =>
      supabase.from('mesas').update({
        estado,
        pedido_activo_id: pedidoId,
        hora_ocupacion: horaOcupacion
      }).eq('id', id)
    )
    return !error
  },

  // Pedidos
  createPedido: async (pedido) => {
    // 1. Insert Pedido
    const { data: pedData, error: pedError } = await safeQuery(() =>
      supabase.from('pedidos').insert({
        numero: pedido.numero,
        fecha: pedido.fecha || new Date().toISOString(),
        mesa_id: pedido.mesa_id,
        tipo: pedido.tipo,
        metodo_pago: pedido.metodo_pago,
        total: pedido.total,
        recibido: pedido.recibido || 0,
        cambio: pedido.cambio || 0,
        direccion: pedido.direccion,
        notas: pedido.notes || pedido.notas,
        estado: pedido.estado || 'completado'
      }).select()
    )

    if (pedError || !pedData || pedData.length === 0) return null
    const newPedidoId = pedData[0].id

    // 2. Insert Pedido Items
    const itemsToInsert = pedido.items.map(item => ({
      pedido_id: newPedidoId,
      producto_codigo: item.codigo || item.id,
      nombre: item.name || item.nombre,
      precio_unitario: item.precioTotalItem || item.price,
      cantidad: item.cantidad,
      subtotal: (item.precioTotalItem || item.price) * item.cantidad,
      personalizacion: item.personalizacion || {}
    }))

    const { error: itemsError } = await safeQuery(() =>
      supabase.from('pedido_items').insert(itemsToInsert)
    )

    if (itemsError) return null

    // 3. Deduct inventory (inventory deduction runs locally, and synchronizes)
    // Supabase can run this via functions, but doing it from dbManager offline/online ensures parity.
    return newPedidoId
  },

  getPedidosHoy: async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data: peds, error } = await safeQuery(() =>
      supabase.from('pedidos')
        .select('*, items:pedido_items(*)')
        .gte('fecha', `${today}T00:00:00`)
        .lte('fecha', `${today}T23:59:59`)
        .order('id', { ascending: false })
    )
    return error ? null : peds
  },

  getPedidosPorRango: async (desde, hasta) => {
    const { data: peds, error } = await safeQuery(() =>
      supabase.from('pedidos')
        .select('*, items:pedido_items(*)')
        .gte('fecha', `${desde}T00:00:00`)
        .lte('fecha', `${hasta}T23:59:59`)
        .order('id', { ascending: false })
    )
    return error ? null : peds
  },

  // Inventario
  getInventario: async () => {
    const { data, error } = await safeQuery(() =>
      supabase.from('inventario').select('*').order('nombre')
    )
    return error ? null : data
  },
  updateInventarioStock: async (id, cantidad) => {
    const { error } = await safeQuery(() =>
      supabase.from('inventario').update({
        cantidad_actual: cantidad,
        updated_at: new Date().toISOString()
      }).eq('id', id)
    )
    return !error
  }
}
