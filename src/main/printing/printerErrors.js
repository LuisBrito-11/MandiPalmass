export const PrinterErrorCode = Object.freeze({
  DESACTIVADA: 'DESACTIVADA',
  DATOS_INVALIDOS: 'DATOS_INVALIDOS',
  CONFIG_INVALIDA: 'CONFIG_INVALIDA',
  TIPO_NO_SOPORTADO: 'TIPO_NO_SOPORTADO',
  CONEXION_RECHAZADA: 'CONEXION_RECHAZADA',
  TIEMPO_AGOTADO: 'TIEMPO_AGOTADO',
  IMPRESORA_NO_ENCONTRADA: 'IMPRESORA_NO_ENCONTRADA',
  ERROR_ENVIO: 'ERROR_ENVIO'
})

const DEFAULT_MESSAGES = {
  [PrinterErrorCode.DESACTIVADA]: 'La impresora está desactivada en la configuración',
  [PrinterErrorCode.DATOS_INVALIDOS]: 'Los datos del ticket no son válidos',
  [PrinterErrorCode.CONFIG_INVALIDA]: 'La configuración de la impresora está incompleta',
  [PrinterErrorCode.TIPO_NO_SOPORTADO]: 'El tipo de conexión no está soportado',
  [PrinterErrorCode.CONEXION_RECHAZADA]: 'No se pudo conectar con la impresora. Verifica que esté encendida y que la IP sea correcta',
  [PrinterErrorCode.TIEMPO_AGOTADO]: 'La impresora no respondió a tiempo',
  [PrinterErrorCode.IMPRESORA_NO_ENCONTRADA]: 'No se encontró la impresora o el puerto configurado',
  [PrinterErrorCode.ERROR_ENVIO]: 'No se pudo enviar el ticket a la impresora'
}

export class PrinterError extends Error {
  constructor(code, message, { cause } = {}) {
    super(message || DEFAULT_MESSAGES[code] || 'Error de impresión', { cause })
    this.name = 'PrinterError'
    this.code = code
  }
}

/**
 * Convierte cualquier error en la respuesta estándar `{ success: false, code, message }`.
 * `error` repite el mensaje: la interfaz actual lo lee con ese nombre.
 */
export function toFailure(error) {
  const known = error instanceof PrinterError
  const code = known ? error.code : PrinterErrorCode.ERROR_ENVIO
  const message = known ? error.message : DEFAULT_MESSAGES[PrinterErrorCode.ERROR_ENVIO]
  return { success: false, code, message, error: message }
}
