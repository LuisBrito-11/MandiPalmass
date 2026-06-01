import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import fs from 'fs'

const dbPath = join(app.getPath('userData'), 'mandipalmas.db')
console.log('SQLite Database path:', dbPath)

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

// Initialize tables if they do not exist
export function initSqlite() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      emoji TEXT,
      orden INTEGER DEFAULT 0,
      activa INTEGER DEFAULT 1,
      pendiente_sync INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoria_id INTEGER,
      codigo TEXT UNIQUE NOT NULL,
      nombre TEXT NOT NULL,
      precio INTEGER NOT NULL,
      ingredientes TEXT,
      activo INTEGER DEFAULT 1,
      pendiente_sync INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS mesas (
      id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      estado TEXT DEFAULT 'libre',
      pedido_activo_id INTEGER,
      hora_ocupacion TEXT,
      pendiente_sync INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero INTEGER NOT NULL,
      fecha TEXT DEFAULT CURRENT_TIMESTAMP,
      mesa_id INTEGER,
      tipo TEXT NOT NULL,
      metodo_pago TEXT,
      total INTEGER NOT NULL,
      recibido INTEGER DEFAULT 0,
      cambio INTEGER DEFAULT 0,
      direccion TEXT,
      notas TEXT,
      estado TEXT DEFAULT 'completado',
      pendiente_sync INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS pedido_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER,
      producto_codigo TEXT,
      nombre TEXT NOT NULL,
      precio_unitario INTEGER NOT NULL,
      cantidad INTEGER NOT NULL,
      subtotal INTEGER NOT NULL,
      personalizacion TEXT,
      pendiente_sync INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS inventario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      cantidad_actual REAL DEFAULT 0,
      unidad TEXT DEFAULT 'unidades',
      stock_minimo REAL DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      pendiente_sync INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS recetas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_codigo TEXT NOT NULL,
      inventario_id INTEGER,
      cantidad_requerida REAL NOT NULL,
      pendiente_sync INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cierres_caja (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      total_ventas INTEGER,
      total_efectivo INTEGER,
      total_transferencia INTEGER,
      cantidad_pedidos INTEGER,
      notas TEXT,
      pendiente_sync INTEGER DEFAULT 0
    );
  `)

  // Seed default 15 mesas if empty
  const countMesas = db.prepare('SELECT COUNT(*) as count FROM mesas').get()
  if (countMesas.count === 0) {
    const insertMesa = db.prepare('INSERT INTO mesas (id, nombre, estado) VALUES (?, ?, ?)')
    const transaction = db.transaction(() => {
      for (let i = 1; i <= 15; i++) {
        insertMesa.run(i, `Mesa ${i}`, 'libre')
      }
    })
    transaction()
    console.log('Seeded 15 mesas locally')
  }
}

// Local Database Operations
export const sqliteOperations = {
  // Menu
  getCategorias: () => {
    return db.prepare('SELECT * FROM categorias WHERE activa = 1 ORDER BY orden').all()
  },
  getProductos: () => {
    return db.prepare('SELECT * FROM productos WHERE activo = 1').all()
  },
  saveCategoria: (cat) => {
    if (cat.id) {
      db.prepare('UPDATE categorias SET nombre = ?, emoji = ?, orden = ?, activa = ?, pendiente_sync = 1 WHERE id = ?')
        .run(cat.nombre, cat.emoji, cat.orden, cat.activa, cat.id)
      return cat.id
    } else {
      const res = db.prepare('INSERT INTO categorias (nombre, emoji, orden, activa, pendiente_sync) VALUES (?, ?, ?, ?, 1)')
        .run(cat.nombre, cat.emoji, cat.orden, cat.activa)
      return res.lastInsertRowid
    }
  },
  saveProducto: (prod) => {
    const existing = db.prepare('SELECT id FROM productos WHERE codigo = ?').get(prod.codigo)
    if (existing) {
      db.prepare('UPDATE productos SET categoria_id = ?, nombre = ?, precio = ?, ingredientes = ?, activo = ?, pendiente_sync = 1 WHERE codigo = ?')
        .run(prod.categoria_id, prod.nombre, prod.precio, prod.ingredientes, prod.activo, prod.codigo)
      return existing.id
    } else {
      const res = db.prepare('INSERT INTO productos (categoria_id, codigo, nombre, precio, ingredientes, activo, pendiente_sync) VALUES (?, ?, ?, ?, ?, ?, 1)')
        .run(prod.categoria_id, prod.codigo, prod.nombre, prod.precio, prod.ingredientes, prod.activo)
      return res.lastInsertRowid
    }
  },
  deleteProducto: (id) => {
    db.prepare('UPDATE productos SET activo = 0, pendiente_sync = 1 WHERE id = ?').run(id)
  },

  // Mesas
  getMesas: () => {
    return db.prepare('SELECT * FROM mesas ORDER BY id').all()
  },
  updateMesa: (id, estado, pedidoId, horaOcupacion = null) => {
    db.prepare('UPDATE mesas SET estado = ?, pedido_activo_id = ?, hora_ocupacion = ?, pendiente_sync = 1 WHERE id = ?')
      .run(estado, pedidoId, horaOcupacion, id)
  },

  // Pedidos
  createPedido: (pedido) => {
    const insertPed = db.prepare(`
      INSERT INTO pedidos (numero, fecha, mesa_id, tipo, metodo_pago, total, recibido, cambio, direccion, notas, estado, pendiente_sync)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `)
    const insertItem = db.prepare(`
      INSERT INTO pedido_items (pedido_id, producto_codigo, nombre, precio_unitario, cantidad, subtotal, personalizacion, pendiente_sync)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `)

    let newPedidoId = null
    const tx = db.transaction(() => {
      const res = insertPed.run(
        pedido.numero,
        pedido.fecha || new Date().toISOString(),
        pedido.mesa_id,
        pedido.tipo,
        pedido.metodo_pago,
        pedido.total,
        pedido.recibido || 0,
        pedido.cambio || 0,
        pedido.direccion,
        pedido.notas,
        pedido.estado || 'completado'
      )
      newPedidoId = res.lastInsertRowid

      for (const item of pedido.items) {
        insertItem.run(
          newPedidoId,
          item.codigo || item.id,
          item.name || item.nombre,
          item.precioTotalItem || item.price,
          item.cantidad,
          (item.precioTotalItem || item.price) * item.cantidad,
          JSON.stringify(item.personalizacion || {})
        )

        // Automatic Inventory Deduction (Fase 5)
        sqliteOperations.deductInventoryForItem(item.codigo || item.id, item.cantidad)
      }
    })
    tx()
    return newPedidoId
  },

  getPedidosHoy: () => {
    const today = new Date().toISOString().split('T')[0]
    const list = db.prepare("SELECT * FROM pedidos WHERE date(fecha) = date('now') ORDER BY id DESC").all()
    return list.map(ped => {
      const items = db.prepare('SELECT * FROM pedido_items WHERE pedido_id = ?').all(ped.id)
      return {
        ...ped,
        items: items.map(it => ({
          ...it,
          personalizacion: JSON.parse(it.personalizacion || '{}')
        }))
      }
    })
  },

  getPedidosPorRango: (desde, hasta) => {
    const list = db.prepare("SELECT * FROM pedidos WHERE date(fecha) >= date(?) AND date(fecha) <= date(?) ORDER BY id DESC").all(desde, hasta)
    return list.map(ped => {
      const items = db.prepare('SELECT * FROM pedido_items WHERE pedido_id = ?').all(ped.id)
      return {
        ...ped,
        items: items.map(it => ({
          ...it,
          personalizacion: JSON.parse(it.personalizacion || '{}')
        }))
      }
    })
  },

  // Inventario
  getInventario: () => {
    return db.prepare('SELECT * FROM inventario ORDER BY nombre').all()
  },
  updateInventarioStock: (id, cantidad) => {
    db.prepare("UPDATE inventario SET cantidad_actual = ?, updated_at = datetime('now'), pendiente_sync = 1 WHERE id = ?")
      .run(cantidad, id)
  },
  deductInventoryForItem: (prodCodigo, cant) => {
    const recetas = db.prepare('SELECT * FROM recetas WHERE producto_codigo = ?').all(prodCodigo)
    for (const r of recetas) {
      const invItem = db.prepare('SELECT cantidad_actual FROM inventario WHERE id = ?').get(r.inventario_id)
      if (invItem) {
        const nuevaCant = Math.max(0, invItem.cantidad_actual - (r.cantidad_requerida * cant))
        sqliteOperations.updateInventarioStock(r.inventario_id, nuevaCant)
      }
    }
  },

  // Sync operations
  getPendientes: (tabla) => {
    return db.prepare(`SELECT * FROM ${tabla} WHERE pendiente_sync = 1`).all()
  },
  marcarSincronizado: (tabla, id) => {
    db.prepare(`UPDATE ${tabla} SET pendiente_sync = 0 WHERE id = ?`).run(id)
  },
  getPedidoItemsRaw: (pedidoId) => {
    const items = db.prepare('SELECT * FROM pedido_items WHERE pedido_id = ?').all(pedidoId)
    return items.map(it => ({
      ...it,
      personalizacion: JSON.parse(it.personalizacion || '{}')
    }))
  }
}
