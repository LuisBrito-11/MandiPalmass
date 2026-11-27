import { formatCurrency } from '../formatCurrency.js'
import { stripEmojis, wrapText } from './textUtils.js'

const INDENT = '  '
const NAME_COLUMN_RATIO = 0.5

const text = (value, opts = {}) => ({ type: 'text', text: stripEmojis(value), ...opts })
const separator = () => ({ type: 'separator' })

function formatDateTime(isoDate) {
  const date = new Date(isoDate)
  return {
    fecha: date.toLocaleDateString('es-CO'),
    hora: date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }
}

function headerLines(business) {
  const lines = [text(business.nombre, { align: 'center', bold: true, size: 'double' })]
  if (business.eslogan) lines.push(text(business.eslogan, { align: 'center' }))
  if (business.nit) lines.push(text(`NIT: ${business.nit}`, { align: 'center' }))
  if (business.direccion) lines.push(text(business.direccion, { align: 'center' }))
  lines.push(separator())
  return lines
}

function metadataLines(ticket) {
  const numero = String(ticket.numero).padStart(3, '0')
  const { fecha, hora } = formatDateTime(ticket.fecha)
  const lines = [text(`PEDIDO: #${numero}`)]
  lines.push(
    ticket.tipo === 'mesa' && ticket.mesa !== null
      ? text(`MESA: ${ticket.mesa}`)
      : text(`MODALIDAD: ${ticket.tipo.toUpperCase()}`)
  )
  lines.push(text(`FECHA: ${fecha}   HORA: ${hora}`))
  if (ticket.direccion) lines.push(text(`DIRECCIÓN: ${ticket.direccion}`))
  lines.push(separator())
  return lines
}

function indented(label, columns) {
  return wrapText(stripEmojis(label), columns - INDENT.length).map((line) =>
    text(INDENT + line)
  )
}

function personalizationLines(personalizacion, columns) {
  const lines = []
  if (personalizacion.salsas.length) {
    lines.push(...indented(`Salsas: ${personalizacion.salsas.join(', ')}`, columns))
  }
  if (personalizacion.toppings.length) {
    lines.push(...indented(`Toppings: ${personalizacion.toppings.join(', ')}`, columns))
  }
  for (const adicion of personalizacion.adiciones) {
    const extra = formatCurrency(adicion.precio * adicion.cantidad)
    lines.push(...indented(`+ ${adicion.nombre} x${adicion.cantidad} (+${extra})`, columns))
  }
  return lines
}

function itemLines(items, columns) {
  const lines = [
    {
      type: 'row',
      columns: [
        { text: 'PRODUCTO', align: 'left', width: 0.5 },
        { text: 'CANT', align: 'center', width: 0.15 },
        { text: 'TOTAL', align: 'right', width: 0.35 }
      ]
    },
    separator()
  ]
  const nameWidth = Math.floor(columns * NAME_COLUMN_RATIO) - 1
  for (const item of items) {
    const [firstLine, ...continuation] = wrapText(stripEmojis(item.nombre), nameWidth)
    lines.push({
      type: 'row',
      columns: [
        { text: firstLine, align: 'left', width: NAME_COLUMN_RATIO },
        { text: `x${item.cantidad}`, align: 'center', width: 0.15 },
        { text: formatCurrency(item.precioUnitario * item.cantidad), align: 'right', width: 0.35 }
      ]
    })
    lines.push(...continuation.map((line) => text(line)))
    lines.push(...personalizationLines(item.personalizacion, columns))
  }
  lines.push(separator())
  return lines
}

function paymentLines(ticket, columns) {
  const lines = [
    text(`TOTAL A PAGAR: ${formatCurrency(ticket.total)}`, { align: 'right', bold: true }),
    separator(),
    text(`MÉTODO: ${ticket.metodoPago.toUpperCase()}`)
  ]
  if (ticket.metodoPago === 'efectivo' && ticket.recibido) {
    lines.push(text(`RECIBIDO: ${formatCurrency(ticket.recibido)}`))
    lines.push(text(`CAMBIO: ${formatCurrency(ticket.cambio)}`))
  }
  if (ticket.notas) {
    lines.push(separator())
    lines.push(...wrapText(`Observaciones: ${stripEmojis(ticket.notas)}`, columns).map((l) => text(l)))
  }
  lines.push(separator())
  return lines
}

function footerLines(business) {
  const contacto = [business.telefono, business.redes].filter(Boolean).join(' · ')
  const lines = []
  if (business.mensajePie) lines.push(text(business.mensajePie, { align: 'center', bold: true }))
  if (contacto) lines.push(text(contacto, { align: 'center' }))
  lines.push({ type: 'feed', lines: 3 }, { type: 'cut' })
  return lines
}

/**
 * Construye el documento neutro de un ticket de venta.
 * @param {import('../input/ticketDataMapper.js').TicketData} ticket ya validado
 * @param {object} business datos del negocio
 * @param {{ columns: number }} options
 */
export function buildTicket(ticket, business, { columns }) {
  return {
    lines: [
      ...headerLines(business),
      ...metadataLines(ticket),
      ...itemLines(ticket.items, columns),
      ...paymentLines(ticket, columns),
      ...footerLines(business)
    ]
  }
}
