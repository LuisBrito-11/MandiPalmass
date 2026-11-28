import { PrinterError, PrinterErrorCode } from '../printerErrors.js'

const TIPOS_VALIDOS = ['mesa', 'local', 'llevar', 'domicilio']

function invalid(field, detail) {
  return new PrinterError(
    PrinterErrorCode.DATOS_INVALIDOS,
    `Datos del ticket inválidos: ${field}${detail ? ` (${detail})` : ''}`
  )
}

function firstDefined(...values) {
  return values.find((v) => v !== undefined && v !== null)
}

function toNumber(value, field, { allowZero = true } = {}) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0 || (!allowZero && n === 0)) throw invalid(field)
  return n
}

function mapAdicion(raw, index, itemIndex) {
  const where = `items[${itemIndex}].adiciones[${index}]`
  const nombre = firstDefined(raw?.nombre, raw?.name)
  if (!nombre) throw invalid(`${where}.nombre`)
  return {
    nombre: String(nombre),
    cantidad: toNumber(firstDefined(raw.cantidad, 1), `${where}.cantidad`, { allowZero: false }),
    precio: toNumber(firstDefined(raw.precio, raw.price, 0), `${where}.precio`)
  }
}

function mapPersonalizacion(raw, itemIndex) {
  const p = raw && typeof raw === 'object' ? raw : {}
  const lista = (value) => (Array.isArray(value) ? value.map(String).filter(Boolean) : [])
  return {
    salsas: lista(p.salsas),
    toppings: lista(p.toppings),
    adiciones: Array.isArray(p.adiciones)
      ? p.adiciones.map((a, i) => mapAdicion(a, i, itemIndex))
      : []
  }
}

function mapItem(raw, index) {
  const where = `items[${index}]`
  const nombre = firstDefined(raw?.nombre, raw?.name)
  if (!nombre) throw invalid(`${where}.nombre`)
  return {
    nombre: String(nombre),
    cantidad: toNumber(raw.cantidad, `${where}.cantidad`, { allowZero: false }),
    precioUnitario: toNumber(
      firstDefined(raw.precioUnitario, raw.precioTotalItem, raw.precio_unitario, raw.price),
      `${where}.precioUnitario`
    ),
    personalizacion: mapPersonalizacion(raw.personalizacion, index)
  }
}

function mapTipo(raw) {
  const tipo = String(firstDefined(raw.tipo, raw.modalidad, 'llevar')).toLowerCase()
  return TIPOS_VALIDOS.includes(tipo) ? tipo : 'llevar'
}

/**
 * Valida y normaliza los datos de un ticket al contrato `TicketData`.
 * Acepta el contrato y también el formato que envía hoy la interfaz
 * (`name`, `precioTotalItem`, `metodo_pago`, `mesa_id`, `modalidad`...).
 */
export function mapTicketData(raw) {
  if (!raw || typeof raw !== 'object') throw invalid('el ticket está vacío')

  const numero = firstDefined(raw.numero, raw.nPedido)
  if (numero === undefined || String(numero).trim() === '') throw invalid('numero')

  const fecha = new Date(raw.fecha)
  if (!raw.fecha || Number.isNaN(fecha.getTime())) throw invalid('fecha')

  if (!Array.isArray(raw.items) || raw.items.length === 0) throw invalid('items', 'sin productos')

  const mesa = firstDefined(raw.mesa, raw.mesa_id)

  return {
    numero,
    fecha: fecha.toISOString(),
    tipo: mesa !== undefined && mesa !== null ? 'mesa' : mapTipo(raw),
    mesa: mesa ?? null,
    items: raw.items.map(mapItem),
    total: toNumber(raw.total, 'total'),
    metodoPago: String(firstDefined(raw.metodoPago, raw.metodo_pago, 'efectivo')).toLowerCase(),
    recibido: raw.recibido ? toNumber(raw.recibido, 'recibido') : 0,
    cambio: raw.cambio ? Math.max(0, Number(raw.cambio) || 0) : 0,
    direccion: String(raw.direccion ?? ''),
    notas: String(raw.notas ?? '')
  }
}
