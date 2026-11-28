import test from 'node:test'
import assert from 'node:assert/strict'
import { registerPrinterIpc } from '../../src/main/printing/printerIpc.js'
import { createPrinterConfigRepository } from '../../src/main/printing/config/jsonConfigRepository.js'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

function setup() {
  const handlers = new Map()
  const ipcMain = { handle: (channel, fn) => handlers.set(channel, fn) }
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mandi-ipc-')), 'printer-config.json')
  const silent = { error() {} }
  const printerConfigRepo = createPrinterConfigRepository(file, silent)
  const printerService = { printTicket: async (t) => ({ success: true, t }), printTest: async () => ({ success: true }), listDevices: async () => ({}) }
  registerPrinterIpc(ipcMain, { printerService, printerConfigRepo, businessConfigRepo: { load: () => ({}), save: () => ({}) }, logger: silent })
  return (channel, ...args) => handlers.get(channel)({}, ...args)
}

test('registra todos los canales que usa el preload', () => {
  const handlers = new Set()
  registerPrinterIpc({ handle: (c) => handlers.add(c) }, { printerService: {}, printerConfigRepo: {}, businessConfigRepo: {} })
  for (const channel of ['print', 'testPrint', 'getConfig', 'saveConfig', 'listDevices', 'getBusiness', 'saveBusiness']) {
    assert.ok(handlers.has(`printer:${channel}`), channel)
  }
})

test('getConfig incluye ipAddress para la pantalla de administración actual', async () => {
  const call = setup()
  assert.equal((await call('printer:getConfig')).ipAddress, '192.168.1.100')
})

test('saveConfig acepta el formato anterior y devuelve un valor verdadero', async () => {
  const call = setup()
  const res = await call('printer:saveConfig', { ipAddress: '10.1.1.9', enabled: true, paperWidth: '80mm' })
  assert.ok(res)
  assert.equal((await call('printer:getConfig')).ipAddress, '10.1.1.9')
})

test('saveConfig devuelve false si la configuración es inválida', async () => {
  const call = setup()
  assert.equal(await call('printer:saveConfig', { copies: 99 }), false)
})
