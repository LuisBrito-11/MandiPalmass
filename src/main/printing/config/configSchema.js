import { PrinterError, PrinterErrorCode } from '../printerErrors.js'

export const CONNECTION_TYPES = ['network', 'spooler', 'serial']
export const PRINTER_TYPES = ['EPSON'] // ESC/POS. Star se agrega aquí cuando se implemente.
export const CODE_PAGES = [
  'PC850_MULTILINGUAL',
  'PC858_EURO',
  'WPC1252',
  'PC437_USA',
  'PC860_PORTUGUESE'
]
export const PAPER_PRESETS = { 58: 32, 80: 48 }

export const DEFAULT_PRINTER_CONFIG = Object.freeze({
  version: 2,
  enabled: true,
  autoPrint: false,
  copies: 1,
  openDrawer: false,
  printerType: 'EPSON',
  codePage: 'PC850_MULTILINGUAL',
  paper: { widthMm: 80, columns: 48 },
  connection: {
    type: 'network',
    network: { host: '192.168.1.100', port: 9100, timeoutMs: 4000 },
    spooler: { printerName: '' },
    serial: { path: '', baudRate: 9600 }
  }
})

export const DEFAULT_BUSINESS_CONFIG = Object.freeze({
  nombre: 'MANDIPALMAS',
  eslogan: '¿CON QUÉ VAS A CALMAR EL ANTOJO?',
  nit: '',
  direccion: '',
  telefono: '300 5863581',
  redes: '@MANDIPALMAS_',
  mensajePie: '¡GRACIAS POR TU COMPRA!'
})

function invalid(field) {
  return new PrinterError(PrinterErrorCode.CONFIG_INVALIDA, `Configuración inválida: ${field}`)
}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function mergeDeep(base, patch) {
  const out = clone(base)
  for (const [key, value] of Object.entries(patch ?? {})) {
    out[key] = isObject(value) && isObject(out[key]) ? mergeDeep(out[key], value) : value
  }
  return out
}

function intInRange(value, field, min, max) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < min || n > max) throw invalid(field)
  return n
}

function oneOf(value, allowed, field) {
  if (!allowed.includes(value)) throw invalid(field)
  return value
}

function text(value, field) {
  if (typeof value !== 'string') throw invalid(field)
  return value.trim()
}

/** El formato anterior se reconoce por sus campos propios: `ipAddress` y `paperWidth`. */
function isLegacy(input) {
  return isObject(input) && (input.ipAddress !== undefined || input.paperWidth !== undefined)
}

function migrateLegacy(input) {
  const patch = {}
  if (input.enabled !== undefined) patch.enabled = Boolean(input.enabled)
  if (input.ipAddress !== undefined) {
    patch.connection = { type: 'network', network: { host: String(input.ipAddress).trim() } }
  }
  if (input.paperWidth !== undefined) {
    const widthMm = parseInt(input.paperWidth, 10)
    if (PAPER_PRESETS[widthMm]) patch.paper = { widthMm, columns: PAPER_PRESETS[widthMm] }
  }
  return patch
}

function validatePrinterConfig(c) {
  return {
    version: 2,
    enabled: Boolean(c.enabled),
    autoPrint: Boolean(c.autoPrint),
    copies: intInRange(c.copies, 'copies', 1, 5),
    openDrawer: Boolean(c.openDrawer),
    printerType: oneOf(c.printerType, PRINTER_TYPES, 'printerType'),
    codePage: oneOf(c.codePage, CODE_PAGES, 'codePage'),
    paper: {
      widthMm: intInRange(c.paper?.widthMm, 'paper.widthMm', 40, 120),
      columns: intInRange(c.paper?.columns, 'paper.columns', 16, 96)
    },
    connection: {
      type: oneOf(c.connection?.type, CONNECTION_TYPES, 'connection.type'),
      network: {
        host: text(c.connection?.network?.host, 'connection.network.host'),
        port: intInRange(c.connection?.network?.port, 'connection.network.port', 1, 65535),
        timeoutMs: intInRange(c.connection?.network?.timeoutMs, 'connection.network.timeoutMs', 500, 60000)
      },
      spooler: { printerName: text(c.connection?.spooler?.printerName, 'connection.spooler.printerName') },
      serial: {
        path: text(c.connection?.serial?.path, 'connection.serial.path'),
        baudRate: intInRange(c.connection?.serial?.baudRate, 'connection.serial.baudRate', 1200, 921600)
      }
    }
  }
}

/**
 * Convierte lo que llegue (formato anterior o v2, completo o parcial) en una
 * configuración v2 válida, usando `current` como base. Lanza CONFIG_INVALIDA.
 */
export function normalizePrinterConfig(input, current = DEFAULT_PRINTER_CONFIG) {
  if (!isObject(input)) throw invalid('la configuración está vacía')
  const patch = isLegacy(input) ? migrateLegacy(input) : input
  return validatePrinterConfig(mergeDeep(current, patch))
}

/** Valida los datos del negocio. Los campos que falten toman el valor actual. */
export function normalizeBusinessConfig(input, current = DEFAULT_BUSINESS_CONFIG) {
  if (!isObject(input)) throw invalid('los datos del negocio están vacíos')
  const merged = { ...current, ...input }
  const out = {}
  for (const key of Object.keys(DEFAULT_BUSINESS_CONFIG)) {
    out[key] = text(String(merged[key] ?? ''), `negocio.${key}`)
  }
  return out
}
