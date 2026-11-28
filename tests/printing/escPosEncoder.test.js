import test from 'node:test'
import assert from 'node:assert/strict'
import { encodeEscPos } from '../../src/main/printing/encoding/escPosEncoder.js'
import { PrinterErrorCode } from '../../src/main/printing/printerErrors.js'

const options = { printerType: 'EPSON', columns: 48, codePage: 'PC850_MULTILINGUAL' }
const encode = (lines, opts = options) => encodeEscPos({ lines }, opts)
const indexOfBytes = (buf, bytes) => buf.indexOf(Buffer.from(bytes))

test('empieza con ESC @ (inicializar) y selecciona la página de códigos', () => {
  const buf = encode([{ type: 'text', text: 'hola' }])
  assert.deepEqual([...buf.subarray(0, 2)], [0x1b, 0x40])
  assert.notEqual(indexOfBytes(buf, [0x1b, 0x74, 2]), -1) // ESC t 2 = PC850
})

test('codifica Ñ, tildes y signos del español en PC850', () => {
  const buf = encode([{ type: 'text', text: 'Ñ á é ¿ ¡' }])
  for (const byte of [0xa5, 0xa0, 0x82, 0xa8, 0xad]) assert.notEqual(buf.indexOf(byte), -1, `falta 0x${byte.toString(16)}`)
})

test('el corte genera GS V', () => {
  const buf = encode([{ type: 'cut' }])
  assert.notEqual(indexOfBytes(buf, [0x1d, 0x56]), -1)
})

test('el cajón genera pulso ESC p', () => {
  const buf = encode([{ type: 'drawer' }])
  assert.notEqual(indexOfBytes(buf, [0x1b, 0x70]), -1)
})

test('el separador mide exactamente las columnas configuradas', () => {
  for (const columns of [32, 48]) {
    const text = encode([{ type: 'separator' }], { ...options, columns }).toString('latin1')
    assert.match(text, new RegExp(`-{${columns}}\\n`))
    assert.doesNotMatch(text, new RegExp(`-{${columns + 1}}`))
  }
})

test('la fila de tabla incluye todas las columnas', () => {
  const buf = encode([{ type: 'row', columns: [
    { text: 'ITEM', align: 'left', width: 0.5 },
    { text: 'x1', align: 'center', width: 0.15 },
    { text: '$ 5.000', align: 'right', width: 0.35 }
  ] }])
  const text = buf.toString('latin1')
  assert.match(text, /ITEM/)
  assert.match(text, /x1/)
  assert.match(text, /\$ 5\.000/)
})

test('rechaza líneas y tipos de impresora desconocidos', () => {
  assert.throws(() => encode([{ type: 'qr' }]), (e) => e.code === PrinterErrorCode.DATOS_INVALIDOS)
  assert.throws(() => encode([], { ...options, printerType: 'OTRA' }), (e) => e.code === PrinterErrorCode.CONFIG_INVALIDA)
})
