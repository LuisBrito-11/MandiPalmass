import test from 'node:test'
import assert from 'node:assert/strict'
import { mapTicketData } from '../../src/main/printing/input/ticketDataMapper.js'
import { buildTicket } from '../../src/main/printing/ticket/ticketBuilder.js'
import { buildTestTicket } from '../../src/main/printing/ticket/testTicketBuilder.js'
import { business, legacyOrder, printerConfig, textOf } from './fixtures.js'

const build = (order = {}, biz = business(), columns = 48) =>
  buildTicket(mapTicketData(legacyOrder(order)), biz, { columns })

test('incluye encabezado, pedido, modalidad, ítems y totales', () => {
  const text = textOf(build())
  assert.match(text, /MANDIPALMAS/)
  assert.match(text, /PEDIDO: #007/)
  assert.match(text, /MODALIDAD: LOCAL/)
  assert.match(text, /Waffle Clásico\|x2\|\$ 30\.000/)
  assert.match(text, /Salsas: Chocolate, Arequipe/)
  assert.match(text, /Toppings: Fresas/)
  assert.match(text, /\+ Helado x1 \(\+\$ 3\.000\)/)
  assert.match(text, /TOTAL A PAGAR: \$ 36\.000/)
  assert.match(text, /MÉTODO: EFECTIVO/)
  assert.match(text, /RECIBIDO: \$ 40\.000/)
  assert.match(text, /CAMBIO: \$ 4\.000/)
})

test('un nombre largo se parte por palabras sin pasar el ancho de su columna', () => {
  const order = legacyOrder({ items: [{ name: 'Waffle Clásico con nombre largo de producto', cantidad: 1, precioTotalItem: 9000 }], total: 9000 })
  const lines = build(order).lines
  const row = lines.find((l) => l.type === 'row' && l.columns[1].text === 'x1')
  assert.equal(row.columns[0].text, 'Waffle Clásico con')
  assert.ok(row.columns[0].text.length <= 23)
  const continuation = lines.filter((l) => l.type === 'text').map((l) => l.text)
  assert.ok(continuation.includes('nombre largo de'))
  assert.ok(continuation.includes('producto'))
})

test('muestra la mesa cuando el pedido es de mesa', () => {
  assert.match(textOf(build({ mesa_id: 5 })), /MESA: 5/)
})

test('no muestra recibido ni cambio si no se pagó en efectivo', () => {
  const text = textOf(build({ metodo_pago: 'tarjeta' }))
  assert.doesNotMatch(text, /RECIBIDO|CAMBIO/)
})

test('quita los emojis de las observaciones', () => {
  const text = textOf(build())
  assert.match(text, /Observaciones: Sin azúcar/)
  assert.doesNotMatch(text, /🍓/)
})

test('NIT y dirección del negocio salen solo si existen', () => {
  assert.doesNotMatch(textOf(build()), /NIT/)
  const withData = textOf(build({}, business({ nit: '900.123.456-7', direccion: 'Calle 1 # 2-3' })))
  assert.match(withData, /NIT: 900\.123\.456-7/)
  assert.match(withData, /Calle 1 # 2-3/)
})

test('termina con avance de papel y corte', () => {
  const lines = build().lines
  assert.deepEqual(lines.slice(-2).map((l) => l.type), ['feed', 'cut'])
})

test('el ticket de prueba trae caracteres del español y el tipo de conexión', () => {
  const text = textOf(buildTestTicket(printerConfig(), business(), new Date('2026-11-27T12:00:00Z')))
  assert.match(text, /PRUEBA DE IMPRESIÓN/)
  assert.match(text, /ÑñÁÉÍÓÚ/)
  assert.match(text, /Red \(TCP\)/)
  assert.match(text, /80 mm, 48 columnas/)
})
