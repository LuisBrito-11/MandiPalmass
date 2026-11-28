import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { normalizeBusinessConfig, normalizePrinterConfig } from '../../src/main/printing/config/configSchema.js'
import { createBusinessConfigRepository, createPrinterConfigRepository } from '../../src/main/printing/config/jsonConfigRepository.js'
import { PrinterErrorCode } from '../../src/main/printing/printerErrors.js'

const silent = { error() {} }
const tmpFile = (name) => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mandi-cfg-')), name)
const isConfigError = (e) => e.code === PrinterErrorCode.CONFIG_INVALIDA

test('migra la configuración anterior (ipAddress, paperWidth, enabled)', () => {
  const c = normalizePrinterConfig({ ipAddress: ' 10.0.0.5 ', paperWidth: '58mm', enabled: false })
  assert.equal(c.version, 2)
  assert.equal(c.enabled, false)
  assert.equal(c.connection.type, 'network')
  assert.equal(c.connection.network.host, '10.0.0.5')
  assert.equal(c.connection.network.port, 9100)
  assert.deepEqual(c.paper, { widthMm: 58, columns: 32 })
})

test('un cambio parcial v2 conserva el resto de la configuración', () => {
  const base = normalizePrinterConfig({ ipAddress: '10.0.0.5' })
  const c = normalizePrinterConfig({ connection: { type: 'spooler', spooler: { printerName: 'POS-80' } } }, base)
  assert.equal(c.connection.type, 'spooler')
  assert.equal(c.connection.spooler.printerName, 'POS-80')
  assert.equal(c.connection.network.host, '10.0.0.5')
})

test('valores por defecto: cajón apagado, 1 copia, impresión automática apagada', () => {
  const c = normalizePrinterConfig({})
  assert.equal(c.openDrawer, false)
  assert.equal(c.copies, 1)
  assert.equal(c.autoPrint, false)
})

test('rechaza configuraciones inválidas', () => {
  for (const bad of [
    { connection: { type: 'infrarrojo' } },
    { copies: 0 },
    { copies: 9 },
    { codePage: 'KLINGON' },
    { printerType: 'STAR' },
    { connection: { network: { port: 70000 } } },
    { paper: { columns: 3 } }
  ]) {
    assert.throws(() => normalizePrinterConfig(bad), isConfigError, JSON.stringify(bad))
  }
  assert.throws(() => normalizePrinterConfig(null), isConfigError)
})

test('el repositorio devuelve los valores por defecto si no hay archivo o está dañado', () => {
  const file = tmpFile('printer-config.json')
  const repo = createPrinterConfigRepository(file, silent)
  assert.equal(repo.load().connection.network.host, '192.168.1.100')
  fs.writeFileSync(file, '{ esto no es json')
  assert.equal(repo.load().version, 2)
})

test('el repositorio lee un archivo v1 existente sin reescribirlo', () => {
  const file = tmpFile('printer-config.json')
  const legacy = JSON.stringify({ ipAddress: '192.168.0.50', paperWidth: '80mm', enabled: true })
  fs.writeFileSync(file, legacy)
  const repo = createPrinterConfigRepository(file, silent)
  assert.equal(repo.load().connection.network.host, '192.168.0.50')
  assert.equal(fs.readFileSync(file, 'utf-8'), legacy)
})

test('guardar combina con lo ya guardado y persiste en v2', () => {
  const file = tmpFile('printer-config.json')
  const repo = createPrinterConfigRepository(file, silent)
  repo.save({ ipAddress: '192.168.0.60' })
  repo.save({ copies: 2 })
  const saved = JSON.parse(fs.readFileSync(file, 'utf-8'))
  assert.equal(saved.version, 2)
  assert.equal(saved.copies, 2)
  assert.equal(saved.connection.network.host, '192.168.0.60')
})

test('guardar una configuración inválida lanza error y no toca el archivo', () => {
  const file = tmpFile('printer-config.json')
  const repo = createPrinterConfigRepository(file, silent)
  assert.throws(() => repo.save({ copies: 99 }), isConfigError)
  assert.equal(fs.existsSync(file), false)
})

test('datos del negocio: valores por defecto, guardado parcial y validación', () => {
  const file = tmpFile('business-config.json')
  const repo = createBusinessConfigRepository(file, silent)
  assert.equal(repo.load().nombre, 'MANDIPALMAS')
  const saved = repo.save({ nit: ' 900.1 ' })
  assert.equal(saved.nit, '900.1')
  assert.equal(saved.nombre, 'MANDIPALMAS')
  assert.throws(() => normalizeBusinessConfig(null), isConfigError)
})
