import { DEFAULT_BUSINESS_CONFIG, DEFAULT_PRINTER_CONFIG } from '../../src/main/printing/config/configSchema.js'

/** Pedido en el formato que envía hoy la interfaz (InvoiceModal). */
export function legacyOrder(overrides = {}) {
  return {
    numero: 7,
    fecha: '2026-11-27T15:30:00.000Z',
    items: [
      {
        name: 'Waffle Clásico',
        cantidad: 2,
        precioTotalItem: 15000,
        personalizacion: {
          salsas: ['Chocolate', 'Arequipe'],
          toppings: ['Fresas'],
          adiciones: [{ name: 'Helado', cantidad: 1, price: 3000 }]
        }
      },
      { name: 'Limonada', cantidad: 1, precioTotalItem: 6000 }
    ],
    total: 36000,
    metodo_pago: 'efectivo',
    tipo: 'local',
    mesa_id: null,
    recibido: 40000,
    cambio: 4000,
    direccion: '',
    notas: 'Sin azúcar 🍓',
    ...overrides
  }
}

export const printerConfig = (overrides = {}) => ({ ...structuredClone(DEFAULT_PRINTER_CONFIG), ...overrides })
export const business = (overrides = {}) => ({ ...DEFAULT_BUSINESS_CONFIG, ...overrides })

export const textOf = (document) =>
  document.lines
    .map((l) => (l.type === 'text' ? l.text : l.type === 'row' ? l.columns.map((c) => c.text).join('|') : `[${l.type}]`))
    .join('\n')
