import test from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'
import { EventEmitter } from 'node:events'
import { createNetworkTransport } from '../../src/main/printing/transports/networkTransport.js'
import { PrinterErrorCode } from '../../src/main/printing/printerErrors.js'

function startServer(onConnection) {
  return new Promise((resolve) => {
    const server = net.createServer(onConnection)
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }))
  })
}

const closeServer = (server) => new Promise((resolve) => server.close(resolve))

test('envía los bytes exactos al puerto de la impresora', async () => {
  const chunks = []
  const { server, port } = await startServer((socket) => socket.on('data', (d) => chunks.push(d)))
  try {
    const payload = Buffer.from([0x1b, 0x40, 0x48, 0x6f, 0x6c, 0x61, 0x0a, 0x1d, 0x56, 0x00])
    await createNetworkTransport({ host: '127.0.0.1', port, timeoutMs: 2000 }).send(payload)
    await new Promise((r) => setTimeout(r, 50))
    assert.deepEqual(Buffer.concat(chunks), payload)
  } finally {
    await closeServer(server)
  }
})

test('check() conecta sin enviar datos', async () => {
  let received = 0
  const { server, port } = await startServer((socket) => socket.on('data', (d) => (received += d.length)))
  try {
    await createNetworkTransport({ host: '127.0.0.1', port, timeoutMs: 2000 }).check()
    assert.equal(received, 0)
  } finally {
    await closeServer(server)
  }
})

test('puerto cerrado: CONEXION_RECHAZADA', async () => {
  const { server, port } = await startServer(() => {})
  await closeServer(server)
  await assert.rejects(
    createNetworkTransport({ host: '127.0.0.1', port, timeoutMs: 2000 }).send(Buffer.from('x')),
    (e) => e.code === PrinterErrorCode.CONEXION_RECHAZADA
  )
})

test('sin respuesta: TIEMPO_AGOTADO', async () => {
  // Socket falso que nunca llega a conectarse: solo dispara "timeout" pasado el tiempo configurado.
  const connect = () => {
    const socket = new EventEmitter()
    let timer
    socket.setTimeout = (ms) => { if (ms) timer = setTimeout(() => socket.emit('timeout'), ms) }
    socket.destroy = () => clearTimeout(timer)
    return socket
  }
  await assert.rejects(
    createNetworkTransport({ host: '10.255.255.1', port: 9100, timeoutMs: 100 }, { connect }).send(Buffer.from('x')),
    (e) => e.code === PrinterErrorCode.TIEMPO_AGOTADO
  )
})

test('sin IP: CONFIG_INVALIDA', () => {
  assert.throws(
    () => createNetworkTransport({ host: '', port: 9100, timeoutMs: 1000 }),
    (e) => e.code === PrinterErrorCode.CONFIG_INVALIDA
  )
})
