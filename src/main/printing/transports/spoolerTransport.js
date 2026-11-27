import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { PrinterError, PrinterErrorCode } from '../printerErrors.js'
import { LIST_PRINTERS_COMMAND, RAW_PRINT_SCRIPT, SPOOLER_EXIT } from './spoolerScript.js'

const POWERSHELL = 'powershell.exe'
const BASE_ARGS = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass']
const PROCESS_TIMEOUT_MS = 20000

/** Ejecuta un proceso y devuelve `{ code, stdout }`. No lanza por códigos de salida distintos de 0. */
function runProcess(file, args) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { timeout: PROCESS_TIMEOUT_MS, windowsHide: true, encoding: 'utf8' }, (error, stdout) => {
      if (error && typeof error.code !== 'number') return reject(error)
      resolve({ code: error ? error.code : 0, stdout })
    })
  })
}

/** Impresoras instaladas en Windows. En otros sistemas devuelve una lista vacía. */
export async function listWindowsPrinters({ run = runProcess, platform = process.platform } = {}) {
  if (platform !== 'win32') return []
  try {
    const { stdout } = await run(POWERSHELL, [...BASE_ARGS, '-Command', LIST_PRINTERS_COMMAND])
    return stdout.split(/\r?\n/).map((n) => n.trim()).filter(Boolean)
  } catch (err) {
    console.error('No se pudo listar las impresoras de Windows:', err.message)
    return []
  }
}

function failureFromExitCode(code, cause) {
  if (code === SPOOLER_EXIT.PRINTER_NOT_FOUND) {
    return new PrinterError(PrinterErrorCode.IMPRESORA_NO_ENCONTRADA, undefined, { cause })
  }
  return new PrinterError(PrinterErrorCode.ERROR_ENVIO, undefined, { cause })
}

/**
 * Transporte por el spooler de Windows (USB y cualquier impresora instalada).
 * Envía los bytes en modo RAW, sin pasar por el driver gráfico.
 */
export function createSpoolerTransport(
  { printerName },
  { run = runProcess, platform = process.platform, tmpDir = os.tmpdir() } = {}
) {
  if (platform !== 'win32') {
    throw new PrinterError(PrinterErrorCode.TIPO_NO_SOPORTADO, 'La conexión por USB/spooler solo funciona en Windows')
  }
  if (!printerName) {
    throw new PrinterError(PrinterErrorCode.CONFIG_INVALIDA, 'Falta elegir la impresora de Windows')
  }

  async function send(data) {
    const id = randomUUID()
    const dataFile = path.join(tmpDir, `mandipalmas-ticket-${id}.bin`)
    const scriptFile = path.join(tmpDir, `mandipalmas-print-${id}.ps1`)
    try {
      await fs.writeFile(dataFile, data)
      await fs.writeFile(scriptFile, '﻿' + RAW_PRINT_SCRIPT, 'utf8')
      const { code } = await run(POWERSHELL, [
        ...BASE_ARGS, '-File', scriptFile, '-PrinterName', printerName, '-FilePath', dataFile
      ])
      if (code !== SPOOLER_EXIT.OK) throw failureFromExitCode(code, new Error(`PowerShell terminó con código ${code}`))
    } catch (err) {
      throw err instanceof PrinterError ? err : new PrinterError(PrinterErrorCode.ERROR_ENVIO, undefined, { cause: err })
    } finally {
      await Promise.allSettled([fs.rm(dataFile, { force: true }), fs.rm(scriptFile, { force: true })])
    }
  }

  async function check() {
    const printers = await listWindowsPrinters({ run, platform })
    if (!printers.includes(printerName)) throw new PrinterError(PrinterErrorCode.IMPRESORA_NO_ENCONTRADA)
  }

  return { send, check }
}
