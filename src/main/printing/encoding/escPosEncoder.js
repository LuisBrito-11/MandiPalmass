import { printer as ThermalPrinter, types as PrinterTypes } from 'node-thermal-printer'
import { PrinterError, PrinterErrorCode } from '../printerErrors.js'

// La librería solo genera bytes: la conexión la manejan los transportes.
const NO_CONNECTION = {}

const ALIGN = {
  left: (p) => p.alignLeft(),
  center: (p) => p.alignCenter(),
  right: (p) => p.alignRight()
}

function applyTextStyle(printer, { align = 'left', bold = false, size = 'normal' }) {
  ALIGN[align](printer)
  printer.bold(bold)
  if (size === 'double') {
    printer.setTextDoubleHeight()
    printer.setTextDoubleWidth()
  }
}

function resetTextStyle(printer) {
  printer.setTextNormal()
  printer.bold(false)
  printer.alignLeft()
}

const LINE_RENDERERS = {
  text(printer, line) {
    applyTextStyle(printer, line)
    printer.println(line.text)
    resetTextStyle(printer)
  },
  row(printer, line) {
    printer.tableCustom(
      line.columns.map((c) => ({ text: c.text, align: c.align.toUpperCase(), width: c.width }))
    )
  },
  separator(printer) {
    printer.drawLine()
  },
  feed(printer, line) {
    for (let i = 0; i < line.lines; i++) printer.newLine()
  },
  cut(printer) {
    printer.cut()
  },
  drawer(printer) {
    printer.openCashDrawer()
  }
}

/**
 * Convierte un documento neutro en los bytes ESC/POS que se envían a la impresora.
 * @param {{ lines: object[] }} document
 * @param {{ printerType: 'EPSON', columns: number, codePage: string }} options
 * @returns {Buffer}
 */
export function encodeEscPos(document, { printerType, columns, codePage }) {
  const type = PrinterTypes[printerType]
  if (!type) throw new PrinterError(PrinterErrorCode.CONFIG_INVALIDA, `Tipo de impresora no soportado: ${printerType}`)

  const printer = new ThermalPrinter({ type, interface: NO_CONNECTION, width: columns })
  printer.initHardware()
  printer.setCharacterSet(codePage)

  for (const line of document.lines) {
    const render = LINE_RENDERERS[line.type]
    if (!render) throw new PrinterError(PrinterErrorCode.DATOS_INVALIDOS, `Línea de ticket desconocida: ${line.type}`)
    render(printer, line)
  }
  return printer.getBuffer()
}
