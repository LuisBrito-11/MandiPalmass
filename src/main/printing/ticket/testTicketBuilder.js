import { stripEmojis } from './textUtils.js'

const CONNECTION_LABELS = {
  network: 'Red (TCP)',
  spooler: 'USB / impresora de Windows',
  serial: 'Serial / Bluetooth'
}

const text = (value, opts = {}) => ({ type: 'text', text: stripEmojis(value), ...opts })

/**
 * Ticket de prueba: confirma conexión, ancho de papel y caracteres del español.
 * @param {object} config configuración v2 de la impresora
 * @param {object} business datos del negocio
 * @param {Date} now
 */
export function buildTestTicket(config, business, now = new Date()) {
  const { type } = config.connection
  return {
    lines: [
      text(business.nombre, { align: 'center', bold: true, size: 'double' }),
      text('PRUEBA DE IMPRESIÓN', { align: 'center', bold: true }),
      { type: 'separator' },
      text(`Conexión: ${CONNECTION_LABELS[type] ?? type}`),
      text(`Papel: ${config.paper.widthMm} mm, ${config.paper.columns} columnas`),
      text(`Fecha: ${now.toLocaleString('es-CO')}`),
      { type: 'separator' },
      text('Caracteres: ÑñÁÉÍÓÚáéíóú ¿¡ $'),
      text('Si lees bien esta línea, la impresora está lista.', { align: 'center' }),
      { type: 'feed', lines: 3 },
      { type: 'cut' }
    ]
  }
}
