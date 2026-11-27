import test from 'node:test'
import assert from 'node:assert/strict'
import { createSerialTransport, listSerialPorts } from '../../src/main/printing/transports/serialTransport.js'
import { PrinterErrorCode } from '../../src/main/printing/printerErrors.js'

/** SerialPort falso que registra lo que ocurre y permite simular fallos. */
function fakeSerialPort({ openError = null, writeError = null } = {}) {
  const log = { opened: null, written: [], closed: false }
  class FakeSerialPort {
    static async list() {
      return [{ path: 'COM5', friendlyName: 'Standard Serial over Bluetooth link (COM5)' }, { path: 'COM3' }]
    }
    constructor(options) {
      log.opened = options
      this.isOpen = false
    }
    open(cb) { setImmediate(() => { this.isOpen = !openError; cb(openError) }) }
    write(data, cb) { log.written.push(data); setImmediate(() => cb(writeError)) }
    drain(cb) { setImmediate(() => cb(null)) }
    close(cb) { log.closed = true; this.isOpen = false; setImmediate(() => cb(null)) }
  }
  return { load: async () => FakeSerialPort, log }
}

test('abre el puerto, escribe, espera y cierra', async () => {
  const { load, log } = fakeSerialPort()
  const payload = Buffer.from([0x1b, 0x40])
  await createSerialTransport({ path: 'COM5', baudRate: 19200 }, { load }).send(payload)
  assert.deepEqual(log.opened, { path: 'COM5', baudRate: 19200, autoOpen: false })
  assert.deepEqual(log.written, [payload])
  assert.equal(log.closed, true)
})

test('puerto inexistente: IMPRESORA_NO_ENCONTRADA', async () => {
  const { load } = fakeSerialPort({ openError: new Error('Opening COM9: File not found') })
  await assert.rejects(
    createSerialTransport({ path: 'COM9', baudRate: 9600 }, { load }).send(Buffer.from('a')),
    (e) => e.code === PrinterErrorCode.IMPRESORA_NO_ENCONTRADA
  )
})

test('puerto ocupado: ERROR_ENVIO', async () => {
  const { load } = fakeSerialPort({ openError: new Error('Opening COM5: Access denied') })
  await assert.rejects(
    createSerialTransport({ path: 'COM5', baudRate: 9600 }, { load }).send(Buffer.from('a')),
    (e) => e.code === PrinterErrorCode.ERROR_ENVIO
  )
})

test('si falla la escritura cierra el puerto igualmente', async () => {
  const { load, log } = fakeSerialPort({ writeError: new Error('boom') })
  await assert.rejects(
    createSerialTransport({ path: 'COM5', baudRate: 9600 }, { load }).send(Buffer.from('a')),
    (e) => e.code === PrinterErrorCode.ERROR_ENVIO
  )
  assert.equal(log.closed, true)
})

test('lista los puertos con una etiqueta legible', async () => {
  const { load } = fakeSerialPort()
  const ports = await listSerialPorts({ load })
  assert.equal(ports[0].path, 'COM5')
  assert.match(ports[0].label, /COM5 - Standard Serial over Bluetooth/)
  assert.equal(ports[1].label, 'COM3')
})

test('sin puerto configurado: CONFIG_INVALIDA', () => {
  assert.throws(() => createSerialTransport({ path: '', baudRate: 9600 }), (e) => e.code === PrinterErrorCode.CONFIG_INVALIDA)
})
