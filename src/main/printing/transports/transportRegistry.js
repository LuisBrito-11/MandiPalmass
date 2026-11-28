import { PrinterError, PrinterErrorCode } from '../printerErrors.js'
import { createNetworkTransport } from './networkTransport.js'
import { createSerialTransport, listSerialPorts } from './serialTransport.js'
import { createSpoolerTransport, listWindowsPrinters } from './spoolerTransport.js'

/**
 * Cada tipo de conexión registra cómo crear su transporte y, si aplica, cómo descubrir dispositivos.
 * Para soportar una conexión nueva basta con agregar una entrada aquí.
 * Un transporte cumple `{ send(buffer): Promise<void>, check(): Promise<void> }`.
 */
const DEFAULT_FACTORIES = {
  network: { create: (c) => createNetworkTransport(c.network), discover: null },
  spooler: { create: (c) => createSpoolerTransport(c.spooler), discover: listWindowsPrinters },
  serial: { create: (c) => createSerialTransport(c.serial), discover: listSerialPorts }
}

export function createTransportRegistry(factories = DEFAULT_FACTORIES) {
  function createTransport(connection) {
    const factory = factories[connection.type]
    if (!factory) {
      throw new PrinterError(PrinterErrorCode.TIPO_NO_SOPORTADO, `Tipo de conexión no soportado: ${connection.type}`)
    }
    return factory.create(connection)
  }

  /** Devuelve `{ [tipo]: dispositivos[] }` solo para los tipos que saben descubrir. */
  async function listDevices() {
    const entries = await Promise.all(
      Object.entries(factories)
        .filter(([, factory]) => factory.discover)
        .map(async ([type, factory]) => [type, await factory.discover()])
    )
    return Object.fromEntries(entries)
  }

  return { createTransport, listDevices }
}
