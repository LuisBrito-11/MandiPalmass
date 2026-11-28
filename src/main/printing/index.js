import { join } from 'node:path'
import {
  createBusinessConfigRepository,
  createPrinterConfigRepository
} from './config/jsonConfigRepository.js'
import { encodeEscPos } from './encoding/escPosEncoder.js'
import { mapTicketData } from './input/ticketDataMapper.js'
import { createPrinterService } from './printerService.js'
import { registerPrinterIpc } from './printerIpc.js'
import { buildTestTicket } from './ticket/testTicketBuilder.js'
import { buildTicket } from './ticket/ticketBuilder.js'
import { createTransportRegistry } from './transports/transportRegistry.js'

/**
 * Raíz de composición del módulo de impresión: arma las piezas y registra los handlers IPC.
 * @param {import('electron').IpcMain} ipcMain
 * @param {string} userDataPath carpeta donde se guardan los archivos de configuración
 */
export function registerPrinting(ipcMain, userDataPath) {
  const printerConfigRepo = createPrinterConfigRepository(join(userDataPath, 'printer-config.json'))
  const businessConfigRepo = createBusinessConfigRepository(join(userDataPath, 'business-config.json'))

  const printerService = createPrinterService({
    printerConfigRepo,
    businessConfigRepo,
    transportRegistry: createTransportRegistry(),
    mapTicketData,
    buildTicket,
    buildTestTicket,
    encode: encodeEscPos
  })

  registerPrinterIpc(ipcMain, { printerService, printerConfigRepo, businessConfigRepo })
}
