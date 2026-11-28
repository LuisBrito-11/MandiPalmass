import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createSpoolerTransport, listWindowsPrinters } from '../../src/main/printing/transports/spoolerTransport.js'
import { RAW_PRINT_SCRIPT, SPOOLER_EXIT } from '../../src/main/printing/transports/spoolerScript.js'
import { PrinterErrorCode } from '../../src/main/printing/printerErrors.js'

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'mandi-spool-'))

test('envía el archivo al script con la impresora indicada y borra los temporales', async () => {
  const dir = tmpDir()
  const calls = []
  const run = async (file, args) => {
    const dataFile = args[args.indexOf('-FilePath') + 1]
    const scriptFile = args[args.indexOf('-File') + 1]
    calls.push({ file, args, data: fs.readFileSync(dataFile), script: fs.readFileSync(scriptFile, 'utf8') })
    return { code: 0, stdout: '' }
  }
  const payload = Buffer.from([0x1b, 0x40, 0x41])
  await createSpoolerTransport({ printerName: 'POS 80 (USB)' }, { run, platform: 'win32', tmpDir: dir }).send(payload)

  assert.equal(calls.length, 1)
  assert.equal(calls[0].file, 'powershell.exe')
  assert.equal(calls[0].args[calls[0].args.indexOf('-PrinterName') + 1], 'POS 80 (USB)')
  assert.deepEqual(calls[0].data, payload)
  assert.match(calls[0].script, /WritePrinter/)
  assert.deepEqual(fs.readdirSync(dir), [])
})

test('impresora inexistente: IMPRESORA_NO_ENCONTRADA y limpia temporales', async () => {
  const dir = tmpDir()
  const run = async () => ({ code: SPOOLER_EXIT.PRINTER_NOT_FOUND, stdout: '' })
  await assert.rejects(
    createSpoolerTransport({ printerName: 'X' }, { run, platform: 'win32', tmpDir: dir }).send(Buffer.from('a')),
    (e) => e.code === PrinterErrorCode.IMPRESORA_NO_ENCONTRADA
  )
  assert.deepEqual(fs.readdirSync(dir), [])
})

test('falla de escritura o de PowerShell: ERROR_ENVIO', async () => {
  const failing = async () => ({ code: SPOOLER_EXIT.WRITE_FAILED, stdout: '' })
  const crashing = async () => { throw new Error('spawn powershell.exe ENOENT') }
  for (const run of [failing, crashing]) {
    await assert.rejects(
      createSpoolerTransport({ printerName: 'X' }, { run, platform: 'win32', tmpDir: tmpDir() }).send(Buffer.from('a')),
      (e) => e.code === PrinterErrorCode.ERROR_ENVIO
    )
  }
})

test('sin nombre de impresora o fuera de Windows no se crea', () => {
  assert.throws(() => createSpoolerTransport({ printerName: '' }, { platform: 'win32' }), (e) => e.code === PrinterErrorCode.CONFIG_INVALIDA)
  assert.throws(() => createSpoolerTransport({ printerName: 'X' }, { platform: 'linux' }), (e) => e.code === PrinterErrorCode.TIPO_NO_SOPORTADO)
})

test('lista las impresoras instaladas y check() valida el nombre', async () => {
  const run = async () => ({ code: 0, stdout: 'POS-80\r\nMicrosoft Print to PDF\r\n\r\n' })
  assert.deepEqual(await listWindowsPrinters({ run, platform: 'win32' }), ['POS-80', 'Microsoft Print to PDF'])
  assert.deepEqual(await listWindowsPrinters({ run, platform: 'linux' }), [])

  const ok = createSpoolerTransport({ printerName: 'POS-80' }, { run, platform: 'win32' })
  await ok.check()
  const missing = createSpoolerTransport({ printerName: 'Otra' }, { run, platform: 'win32' })
  await assert.rejects(missing.check(), (e) => e.code === PrinterErrorCode.IMPRESORA_NO_ENCONTRADA)
})

test('el script RAW usa las llamadas del spooler y los códigos de salida acordados', () => {
  for (const fragment of ['OpenPrinterW', 'StartDocPrinterW', 'WritePrinter', "pDataType = 'RAW'"]) {
    assert.ok(RAW_PRINT_SCRIPT.includes(fragment), fragment)
  }
  assert.match(RAW_PRINT_SCRIPT, new RegExp(`exit ${SPOOLER_EXIT.PRINTER_NOT_FOUND}`))
})
