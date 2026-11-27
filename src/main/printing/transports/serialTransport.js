import { PrinterError, PrinterErrorCode } from '../printerErrors.js'

const OPEN_TIMEOUT_MS = 5000

// `serialport` es un módulo nativo: se carga solo cuando se usa.
async function loadSerialPort() {
  return (await import('serialport')).SerialPort
}

function mapOpenError(err) {
  if (/not found|no such file|cannot find/i.test(err.message)) {
    return new PrinterError(PrinterErrorCode.IMPRESORA_NO_ENCONTRADA, undefined, { cause: err })
  }
  return new PrinterError(PrinterErrorCode.ERROR_ENVIO, 'No se pudo abrir el puerto. Puede estar en uso por otro programa', { cause: err })
}

const callbackToPromise = (fn) => new Promise((resolve, reject) => fn((err) => (err ? reject(err) : resolve())))

/** Puertos COM disponibles (incluye adaptadores USB-serial e impresoras Bluetooth emparejadas). */
export async function listSerialPorts({ load = loadSerialPort } = {}) {
  try {
    const SerialPort = await load()
    const ports = await SerialPort.list()
    return ports.map((p) => ({
      path: p.path,
      label: [p.path, p.friendlyName || p.manufacturer].filter(Boolean).join(' - ')
    }))
  } catch (err) {
    console.error('No se pudo listar los puertos seriales:', err.message)
    return []
  }
}

async function openPort(SerialPort, { path, baudRate }) {
  const port = new SerialPort({ path, baudRate, autoOpen: false })
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new PrinterError(PrinterErrorCode.TIEMPO_AGOTADO)), OPEN_TIMEOUT_MS)
  })
  try {
    await Promise.race([callbackToPromise((cb) => port.open(cb)), timeout])
  } catch (err) {
    throw err instanceof PrinterError ? err : mapOpenError(err)
  } finally {
    clearTimeout(timer)
  }
  return port
}

async function closeQuietly(port) {
  if (port.isOpen) await callbackToPromise((cb) => port.close(cb)).catch(() => {})
}

/** Transporte por puerto serial. En Windows, Bluetooth clásico emparejado aparece como un COM. */
export function createSerialTransport({ path, baudRate }, { load = loadSerialPort } = {}) {
  if (!path) throw new PrinterError(PrinterErrorCode.CONFIG_INVALIDA, 'Falta elegir el puerto serial')

  async function send(data) {
    const SerialPort = await load()
    const port = await openPort(SerialPort, { path, baudRate })
    try {
      await callbackToPromise((cb) => port.write(data, cb))
      await callbackToPromise((cb) => port.drain(cb))
    } catch (err) {
      throw new PrinterError(PrinterErrorCode.ERROR_ENVIO, undefined, { cause: err })
    } finally {
      await closeQuietly(port)
    }
  }

  async function check() {
    const SerialPort = await load()
    await closeQuietly(await openPort(SerialPort, { path, baudRate }))
  }

  return { send, check }
}
