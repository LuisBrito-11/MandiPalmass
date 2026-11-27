import net from 'node:net'
import { PrinterError, PrinterErrorCode } from '../printerErrors.js'

const UNREACHABLE_CODES = ['ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET']

function mapSocketError(err) {
  if (err instanceof PrinterError) return err
  if (UNREACHABLE_CODES.includes(err.code)) {
    return new PrinterError(PrinterErrorCode.CONEXION_RECHAZADA, undefined, { cause: err })
  }
  return new PrinterError(PrinterErrorCode.ERROR_ENVIO, undefined, { cause: err })
}

// Tras entregar los datos se da un margen para que la impresora los reciba antes de cerrar el socket.
// Algunas impresoras no cierran su lado de la conexión, así que no se espera al cierre remoto.
const CLOSE_GRACE_MS = 300

/** Abre el socket, escribe `data` (si hay) y lo cierra. Resuelve cuando los datos fueron entregados. */
function exchange({ host, port, timeoutMs }, data, connect) {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port })
    let settled = false
    const finish = (error) => {
      if (settled) return
      settled = true
      socket.destroy()
      if (error) reject(mapSocketError(error))
      else resolve()
    }

    socket.setTimeout(timeoutMs)
    socket.once('timeout', () => finish(new PrinterError(PrinterErrorCode.TIEMPO_AGOTADO)))
    socket.once('error', finish)
    socket.once('close', () => finish())
    socket.once('connect', () => {
      socket.end(data ?? undefined, () => {
        socket.setTimeout(0)
        setTimeout(() => finish(), CLOSE_GRACE_MS)
      })
    })
  })
}

/** Transporte para impresoras con Ethernet o Wi-Fi (RAW TCP, normalmente puerto 9100). */
export function createNetworkTransport({ host, port, timeoutMs }, { connect = net.createConnection } = {}) {
  if (!host) {
    throw new PrinterError(PrinterErrorCode.CONFIG_INVALIDA, 'Falta la IP de la impresora')
  }
  const target = { host, port, timeoutMs }
  return {
    send: (data) => exchange(target, data, connect),
    check: () => exchange(target, null, connect)
  }
}
