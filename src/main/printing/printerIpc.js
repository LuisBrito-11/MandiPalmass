/**
 * Handlers IPC de impresión. Solo traducen llamadas del renderer a las del servicio y los repositorios.
 *
 * Compatibilidad con la pantalla de administración actual:
 *  - `getConfig` incluye `ipAddress` (alias de `connection.network.host`).
 *  - `saveConfig` acepta el formato anterior y devuelve la configuración guardada, o `false` si es inválida.
 */
const withLegacyAlias = (config) => ({ ...config, ipAddress: config.connection.network.host })

export function registerPrinterIpc(ipcMain, { printerService, printerConfigRepo, businessConfigRepo, logger = console }) {
  const saveOrFalse = (repo, mapResult = (v) => v) => async (_event, input) => {
    try {
      return mapResult(repo.save(input))
    } catch (err) {
      logger.error('No se pudo guardar la configuración de impresión:', err.message)
      return false
    }
  }

  ipcMain.handle('printer:print', (_event, ticketData) => printerService.printTicket(ticketData))
  ipcMain.handle('printer:testPrint', () => printerService.printTest())
  ipcMain.handle('printer:listDevices', () => printerService.listDevices())

  ipcMain.handle('printer:getConfig', () => withLegacyAlias(printerConfigRepo.load()))
  ipcMain.handle('printer:saveConfig', saveOrFalse(printerConfigRepo, withLegacyAlias))

  ipcMain.handle('printer:getBusiness', () => businessConfigRepo.load())
  ipcMain.handle('printer:saveBusiness', saveOrFalse(businessConfigRepo))
}
