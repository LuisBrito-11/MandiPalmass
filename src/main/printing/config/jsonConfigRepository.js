import fs from 'node:fs'
import path from 'node:path'
import {
  DEFAULT_BUSINESS_CONFIG,
  DEFAULT_PRINTER_CONFIG,
  normalizeBusinessConfig,
  normalizePrinterConfig
} from './configSchema.js'

/**
 * Repositorio genérico de configuración en un archivo JSON.
 * `normalize(input, current)` valida y completa; `defaults` se usa si el archivo no existe o está dañado.
 */
function createJsonConfigRepository({ filePath, defaults, normalize, logger = console }) {
  function load() {
    try {
      if (fs.existsSync(filePath)) {
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        return normalize(raw, defaults)
      }
    } catch (err) {
      logger.error(`No se pudo leer ${path.basename(filePath)}, se usan valores por defecto:`, err.message)
    }
    return structuredClone(defaults)
  }

  /** Guarda `input` combinado con lo ya guardado. Lanza CONFIG_INVALIDA si no es válido. */
  function save(input) {
    const next = normalize(input, load())
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(next, null, 2), 'utf-8')
    return next
  }

  return { load, save }
}

export const createPrinterConfigRepository = (filePath, logger) =>
  createJsonConfigRepository({
    filePath,
    defaults: DEFAULT_PRINTER_CONFIG,
    normalize: normalizePrinterConfig,
    logger
  })

export const createBusinessConfigRepository = (filePath, logger) =>
  createJsonConfigRepository({
    filePath,
    defaults: DEFAULT_BUSINESS_CONFIG,
    normalize: normalizeBusinessConfig,
    logger
  })
