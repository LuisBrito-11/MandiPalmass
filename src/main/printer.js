import { printer as ThermalPrinter, types as PrinterTypes } from 'node-thermal-printer'
import { app } from 'electron'
import { join } from 'path'
import fs from 'fs'

const configPath = join(app.getPath('userData'), 'printer-config.json')

// Default configuration
const defaultConfig = {
  ipAddress: '192.168.1.100', // Default IP
  paperWidth: '80mm',
  enabled: true
}

// Load configuration
export function loadPrinterConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8')
      return JSON.parse(data)
    }
  } catch (err) {
    console.error('Failed to load printer configuration:', err)
  }
  return defaultConfig
}

// Save configuration
export function savePrinterConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
    console.log('Saved printer config to:', configPath)
    return true
  } catch (err) {
    console.error('Failed to save printer config:', err)
    return false
  }
}

// Format local currency
function formatCurrency(n) {
  return '$ ' + n.toLocaleString('es-CO')
}

// Print complete receipt
export async function printReceipt(ped) {
  const config = loadPrinterConfig()
  if (!config.enabled) {
    console.log('Printer is disabled in config')
    return { success: false, error: 'La impresora está desactivada en la configuración' }
  }

  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: `tcp://${config.ipAddress}:9100`,
    timeout: 4000,
    width: 48, // Standard characters width for 80mm paper
    characterSet: 'PC860_PORTUGUESE' // Salsas accents and special chars
  })

  try {
    // 1. Header
    printer.alignCenter()
    printer.bold(true)
    printer.setTextDoubleHeight()
    printer.setTextDoubleWidth()
    printer.println('MANDIPALMAS')
    printer.setTextNormal()
    
    printer.bold(false)
    printer.println('¿CON QUÉ VAS A CALMAR EL ANTOJO?')
    printer.println('--------------------------------')
    
    // 2. Metadata
    printer.alignLeft()
    const numPed = String(ped.numero || ped.nPedido).padStart(3, '0')
    printer.println(`PEDIDO: #${numPed}`)
    
    if (ped.mesa_id) {
      printer.println(`MESA: ${ped.mesa_id}`)
    } else {
      printer.println(`MODALIDAD: ${ped.tipo?.toUpperCase() || ped.modalidad?.toUpperCase() || 'LLEVAR'}`)
    }

    const date = new Date(ped.fecha)
    const dateStr = date.toLocaleDateString('es-CO')
    const timeStr = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    printer.println(`FECHA: ${dateStr}   HORA: ${timeStr}`)
    
    if (ped.direccion) {
      printer.println(`DIRECCIÓN: ${ped.direccion}`)
    }
    
    printer.println('--------------------------------')
    
    // 3. Items Headers
    printer.tableCustom([
      { text: 'PRODUCTO', align: 'LEFT', width: 0.5 },
      { text: 'CANT', align: 'CENTER', width: 0.15 },
      { text: 'TOTAL', align: 'RIGHT', width: 0.35 }
    ])
    printer.println('--------------------------------')

    // 4. Print Items
    for (const item of ped.items) {
      const name = item.name || item.nombre
      const cant = item.cantidad
      const price = item.precioTotalItem || item.price || item.precio_unitario
      const total = price * cant

      printer.tableCustom([
        { text: name, align: 'LEFT', width: 0.5 },
        { text: `x${cant}`, align: 'CENTER', width: 0.15 },
        { text: formatCurrency(total), align: 'RIGHT', width: 0.35 }
      ])

      // Print Personalization if any
      const pers = item.personalizacion || {}
      if (pers.salsas && pers.salsas.length > 0) {
        printer.println(`  Salsas: ${pers.salsas.join(', ')}`)
      }
      if (pers.toppings && pers.toppings.length > 0) {
        printer.println(`  Toppings: ${pers.toppings.join(', ')}`)
      }
      if (pers.adiciones && pers.adiciones.length > 0) {
        for (const ad of pers.adiciones) {
          printer.println(`  + ${ad.name} x${ad.cantidad} (+${formatCurrency(ad.price * ad.cantidad)})`)
        }
      }
    }

    printer.println('--------------------------------')
    
    // 5. Totals
    printer.alignRight()
    printer.bold(true)
    printer.println(`TOTAL A PAGAR: ${formatCurrency(ped.total)}`)
    printer.bold(false)
    printer.println('--------------------------------')
    
    // 6. Payment info
    printer.alignLeft()
    printer.println(`MÉTODO: ${ped.metodo_pago?.toUpperCase()}`)
    if (ped.metodo_pago === 'efectivo' && ped.recibido) {
      printer.println(`RECIBIDO: ${formatCurrency(parseFloat(ped.recibido))}`)
      printer.println(`CAMBIO: ${formatCurrency(Math.max(0, ped.cambio || 0))}`)
    }

    if (ped.notas) {
      printer.println('--------------------------------')
      printer.println(`Observaciones: ${ped.notas}`)
    }
    
    // 7. Footer
    printer.println('--------------------------------')
    printer.alignCenter()
    printer.bold(true)
    printer.println('¡GRACIAS POR TU COMPRA!')
    printer.bold(false)
    printer.println('📞 300 5863581 · @MANDIPALMAS_')
    printer.println('\n\n\n')
    printer.cut()

    await printer.execute()
    console.log('Printed receipt successfully for order #', numPed)
    return { success: true }
  } catch (error) {
    console.error('LAN Printer Error:', error)
    return { success: false, error: 'Error al conectar con la impresora. Verifica la red y la IP.' }
  }
}

// Test Print
export async function testPrinter() {
  const config = loadPrinterConfig()
  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: `tcp://${config.ipAddress}:9100`,
    timeout: 3000
  })

  try {
    printer.alignCenter()
    printer.bold(true)
    printer.println('MANDIPALMAS POS')
    printer.println('PRUEBA DE IMPRESIÓN')
    printer.bold(false)
    printer.println(`Conectado a la IP: ${config.ipAddress}`)
    printer.println(`Fecha: ${new Date().toLocaleString()}`)
    printer.println('ESTADO: IMPRESORA FUNCIONANDO 🟢')
    printer.println('\n\n\n')
    printer.cut()
    
    await printer.execute()
    return { success: true }
  } catch (error) {
    console.error('Test Print failed:', error)
    return { success: false, error: error.message }
  }
}
