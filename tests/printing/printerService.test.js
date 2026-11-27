import test from 'node:test'
import assert from 'node:assert/strict'
import { createPrinterService } from '../../src/main/printing/printerService.js'
import { createTransportRegistry } from '../../src/main/printing/transports/transportRegistry.js'
import { mapTicketData } from '../../src/main/printing/input/ticketDataMapper.js'
import { buildTicket } from '../../src/main/printing/ticket/ticketBuilder.js'
import { buildTestTicket } from '../../src/main/printing/ticket/testTicketBuilder.js'
import { encodeEscPos } from '../../src/main/printing/encoding/escPosEncoder.js'
import { PrinterError, PrinterErrorCode } from '../../src/main/printing/printerErrors.js'
import { business, legacyOrder, printerConfig } from './fixtures.js'

const silent = { error() {} }

function setup({ config = printerConfig(), sendError = null } = {}) {
  const sent = []
  const transport = {
    async send(buffer) {
      if (sendError) throw sendError
      sent.push(buffer)
    },
    async check() {}
  }
  const registry = createTransportRegistry({ network: { create: () => transport, discover: null }, fake: { create: () => transport, discover: async () => ['d1'] } })
  const service = createPrinterService({
    printerConfigRepo: { load: () => config },
    businessConfigRepo: { load: () => business() },
    transportRegistry: registry,
    mapTicketData, buildTicket, buildTestTicket, encode: encodeEscPos,
    now: () => new Date('2026-11-27T12:00:00Z'),
    logger: silent
  })
  return { service, sent }
}

const countCuts = (buf) => buf.toString('latin1').split('\x1dV').length - 1

test('imprime un ticket válido enviando los bytes ESC/POS', async () => {
  const { service, sent } = setup()
  assert.deepEqual(await service.printTicket(legacyOrder()), { success: true })
  assert.equal(sent.length, 1)
  assert.deepEqual([...sent[0].subarray(0, 2)], [0x1b, 0x40])
  assert.match(sent[0].toString('latin1'), /PEDIDO: #007/)
})

test('desactivada: no envía nada y responde DESACTIVADA', async () => {
  const { service, sent } = setup({ config: printerConfig({ enabled: false }) })
  const res = await service.printTicket(legacyOrder())
  assert.equal(res.success, false)
  assert.equal(res.code, PrinterErrorCode.DESACTIVADA)
  assert.equal(res.error, res.message)
  assert.equal(sent.length, 0)
})

test('datos inválidos: DATOS_INVALIDOS sin enviar nada', async () => {
  const { service, sent } = setup()
  const res = await service.printTicket({ items: [] })
  assert.equal(res.code, PrinterErrorCode.DATOS_INVALIDOS)
  assert.equal(sent.length, 0)
})

test('copias: un solo envío con el ticket repetido', async () => {
  const { service, sent } = setup({ config: printerConfig({ copies: 3 }) })
  await service.printTicket(legacyOrder())
  assert.equal(sent.length, 1)
  assert.equal(countCuts(sent[0]), 3)
})

test('cajón: se abre una sola vez al final, aunque haya varias copias', async () => {
  const { service, sent } = setup({ config: printerConfig({ openDrawer: true, copies: 2 }) })
  await service.printTicket(legacyOrder())
  const text = sent[0].toString('latin1')
  assert.equal(text.split('\x1bp').length - 1, 2) // ESC p aparece en las dos secuencias del pulso (pin 2 y pin 5)
  assert.ok(text.lastIndexOf('\x1bp') > text.lastIndexOf('\x1dV'))
})

test('sin cajón por defecto', async () => {
  const { service, sent } = setup()
  await service.printTicket(legacyOrder())
  assert.equal(sent[0].toString('latin1').includes('\x1bp'), false)
})

test('traduce los errores del transporte sin lanzar excepciones', async () => {
  const { service } = setup({ sendError: new PrinterError(PrinterErrorCode.CONEXION_RECHAZADA) })
  const res = await service.printTicket(legacyOrder())
  assert.equal(res.success, false)
  assert.equal(res.code, PrinterErrorCode.CONEXION_RECHAZADA)
})

test('un error inesperado se reporta como ERROR_ENVIO genérico', async () => {
  const { service } = setup({ sendError: new TypeError('x is undefined') })
  const res = await service.printTicket(legacyOrder())
  assert.equal(res.code, PrinterErrorCode.ERROR_ENVIO)
  assert.doesNotMatch(res.message, /undefined/)
})

test('tipo de conexión sin transporte registrado: TIPO_NO_SOPORTADO', async () => {
  const config = printerConfig()
  config.connection.type = 'spooler'
  const { service } = setup({ config })
  assert.equal((await service.printTicket(legacyOrder())).code, PrinterErrorCode.TIPO_NO_SOPORTADO)
})

test('la prueba imprime aunque la impresora esté desactivada, con 1 copia y sin cajón', async () => {
  const { service, sent } = setup({ config: printerConfig({ enabled: false, copies: 3, openDrawer: true }) })
  assert.deepEqual(await service.printTest(), { success: true })
  assert.equal(countCuts(sent[0]), 1)
  assert.equal(sent[0].toString('latin1').includes('\x1bp'), false)
})

test('listDevices devuelve solo los tipos que saben descubrir', async () => {
  const { service } = setup()
  assert.deepEqual(await service.listDevices(), { fake: ['d1'] })
})
