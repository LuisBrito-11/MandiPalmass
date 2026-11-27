import test from 'node:test'
import assert from 'node:assert/strict'
import { mapTicketData } from '../../src/main/printing/input/ticketDataMapper.js'
import { PrinterErrorCode } from '../../src/main/printing/printerErrors.js'
import { legacyOrder } from './fixtures.js'

const rejects = (raw, field) =>
  assert.throws(() => mapTicketData(raw), (e) => e.code === PrinterErrorCode.DATOS_INVALIDOS && e.message.includes(field))

test('acepta el formato actual de la interfaz y lo normaliza', () => {
  const t = mapTicketData(legacyOrder())
  assert.equal(t.numero, 7)
  assert.equal(t.tipo, 'local')
  assert.equal(t.metodoPago, 'efectivo')
  assert.equal(t.items[0].nombre, 'Waffle Clásico')
  assert.equal(t.items[0].precioUnitario, 15000)
  assert.deepEqual(t.items[0].personalizacion.adiciones, [{ nombre: 'Helado', cantidad: 1, precio: 3000 }])
  assert.equal(t.items[1].personalizacion.salsas.length, 0)
})

test('acepta el contrato nuevo (nombre, precioUnitario, metodoPago, mesa)', () => {
  const t = mapTicketData({
    numero: '12', fecha: '2026-11-27T10:00:00Z', tipo: 'mesa', mesa: 4,
    items: [{ nombre: 'Café', cantidad: 1, precioUnitario: 3500 }], total: 3500, metodoPago: 'Tarjeta'
  })
  assert.equal(t.tipo, 'mesa')
  assert.equal(t.mesa, 4)
  assert.equal(t.metodoPago, 'tarjeta')
})

test('una mesa fuerza el tipo "mesa"', () => {
  assert.equal(mapTicketData(legacyOrder({ mesa_id: 3 })).tipo, 'mesa')
})

test('rechaza datos incompletos indicando el campo', () => {
  rejects(null, 'vacío')
  rejects(legacyOrder({ numero: undefined }), 'numero')
  rejects(legacyOrder({ fecha: 'no es fecha' }), 'fecha')
  rejects(legacyOrder({ items: [] }), 'items')
  rejects(legacyOrder({ total: 'abc' }), 'total')
  rejects(legacyOrder({ items: [{ name: 'X', cantidad: 0, precioTotalItem: 100 }] }), 'cantidad')
  rejects(legacyOrder({ items: [{ cantidad: 1, precioTotalItem: 100 }] }), 'nombre')
})

test('el cambio nunca es negativo', () => {
  assert.equal(mapTicketData(legacyOrder({ cambio: -500 })).cambio, 0)
})
