import { PrinterError, PrinterErrorCode, toFailure } from './printerErrors.js'

const DRAWER_DOCUMENT = { lines: [{ type: 'drawer' }] }

/**
 * Orquesta la impresión: valida, arma el ticket, lo codifica y lo envía por el transporte configurado.
 * Todas las dependencias llegan por parámetro (ver `index.js`).
 */
export function createPrinterService({
  printerConfigRepo,
  businessConfigRepo,
  transportRegistry,
  mapTicketData,
  buildTicket,
  buildTestTicket,
  encode,
  now = () => new Date(),
  logger = console
}) {
  function encodeFor(config, document) {
    return encode(document, {
      printerType: config.printerType,
      columns: config.paper.columns,
      codePage: config.codePage
    })
  }

  /** Repite el ticket `copies` veces y agrega la apertura del cajón una sola vez. */
  function buildPayload(config, document, { copies, withDrawer }) {
    const ticket = encodeFor(config, document)
    const parts = Array.from({ length: copies }, () => ticket)
    if (withDrawer) parts.push(encodeFor(config, DRAWER_DOCUMENT))
    return Buffer.concat(parts)
  }

  async function run(label, execute) {
    try {
      await execute()
      return { success: true }
    } catch (err) {
      logger.error(`Error de impresión (${label}):`, err.cause ?? err)
      return toFailure(err)
    }
  }

  function printTicket(rawTicket) {
    return run('ticket', async () => {
      const config = printerConfigRepo.load()
      if (!config.enabled) throw new PrinterError(PrinterErrorCode.DESACTIVADA)

      const ticket = mapTicketData(rawTicket)
      const document = buildTicket(ticket, businessConfigRepo.load(), { columns: config.paper.columns })
      const payload = buildPayload(config, document, {
        copies: config.copies,
        withDrawer: config.openDrawer
      })
      await transportRegistry.createTransport(config.connection).send(payload)
    })
  }

  function printTest() {
    return run('prueba', async () => {
      const config = printerConfigRepo.load()
      const document = buildTestTicket(config, businessConfigRepo.load(), now())
      const payload = buildPayload(config, document, { copies: 1, withDrawer: false })
      await transportRegistry.createTransport(config.connection).send(payload)
    })
  }

  async function listDevices() {
    return transportRegistry.listDevices()
  }

  return { printTicket, printTest, listDevices }
}
