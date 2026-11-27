# Módulo de impresión

Imprime tickets en impresoras térmicas ESC/POS (Epson y compatibles, como la Digital POS DIG-E200i) por **red, USB, serial o Bluetooth**. Vive en `src/main/printing/`.

## Cómo conectar la impresora

| Conexión | Cuándo usarla | Qué configurar |
|---|---|---|
| `network` | Modelo con Ethernet o Wi-Fi | IP fija de la impresora (puerto 9100) |
| `spooler` | **USB**, o cualquier impresora instalada en Windows | Nombre exacto de la impresora en Windows |
| `serial` | Puerto COM, adaptador USB-serial o **Bluetooth emparejado** | Puerto COM (en Windows, el Bluetooth clásico emparejado crea uno) y baudios |

**USB con la DIG-E200i**
1. Instalar el driver del fabricante, o agregar la impresora con el controlador "Generic / Text Only".
2. Elegir su nombre en la lista (`window.api.printer.listDevices()` devuelve `{ spooler: [...], serial: [...] }`).
3. Usar la prueba de impresión. Debe salir una línea con `ÑñÁÉÍÓÚ ¿¡`. Si salen símbolos raros, cambiar `codePage` (`PC850_MULTILINGUAL`, `PC858_EURO`, `WPC1252`).

**Bluetooth:** emparejar la impresora desde Windows, ver qué puerto COM le asignó (Configuración, Bluetooth, Más opciones de Bluetooth, Puertos COM) y elegirlo en `serial`.

## API para la interfaz (`window.api.printer`)

| Función | Qué hace | Respuesta |
|---|---|---|
| `print(ticketData)` | Imprime un ticket | `{ success: true }` o `{ success: false, code, message, error }` |
| `testPrint()` | Imprime la prueba | igual |
| `listDevices()` | Impresoras de Windows y puertos COM | `{ spooler: string[], serial: { path, label }[] }` |
| `getConfig()` | Configuración v2, más `ipAddress` por compatibilidad | objeto |
| `saveConfig(config)` | Guarda, combinando con lo ya guardado. Acepta el formato anterior (`ipAddress`, `paperWidth`, `enabled`) | la configuración guardada, o `false` si es inválida |
| `getBusiness()` / `saveBusiness(data)` | Datos del negocio que salen en el ticket | igual que arriba |

`message` es un texto en español apto para mostrar al cajero. `code` sirve para decidir qué hacer.

| `code` | Significado |
|---|---|
| `DESACTIVADA` | La impresión está apagada en la configuración |
| `DATOS_INVALIDOS` | El ticket enviado no cumple el contrato (el mensaje dice el campo) |
| `CONFIG_INVALIDA` | Falta IP, impresora o puerto |
| `TIPO_NO_SOPORTADO` | Tipo de conexión no disponible (ej. USB fuera de Windows) |
| `CONEXION_RECHAZADA` | La IP no responde |
| `TIEMPO_AGOTADO` | La impresora no respondió a tiempo |
| `IMPRESORA_NO_ENCONTRADA` | La impresora de Windows o el COM no existe |
| `ERROR_ENVIO` | Otra falla al enviar |

## Contrato `TicketData`

Lo que recibe `print()`. También se acepta el formato que envía hoy `InvoiceModal.jsx` (`name`, `precioTotalItem`, `metodo_pago`, `mesa_id`, `modalidad`).

```js
{
  numero: 7,                         // número del pedido guardado
  fecha: '2026-11-27T15:30:00.000Z', // fecha del pedido guardado (ISO 8601)
  tipo: 'mesa' | 'local' | 'llevar' | 'domicilio',
  mesa: 4,                           // opcional; si existe, el tipo pasa a 'mesa'
  items: [{
    nombre: 'Waffle Clásico',
    cantidad: 2,
    precioUnitario: 15000,           // incluye las adiciones del ítem
    personalizacion: {               // opcional
      salsas: ['Chocolate'], toppings: ['Fresas'],
      adiciones: [{ nombre: 'Helado', cantidad: 1, precio: 3000 }]
    }
  }],
  total: 30000,
  metodoPago: 'efectivo',
  recibido: 40000, cambio: 10000,    // opcionales
  direccion: '', notas: ''           // opcionales
}
```

## Configuración (`printer-config.json`, versión 2)

Se guarda en la carpeta de datos de la app (`userData`). Campos principales:

- `enabled`, `autoPrint` (apagado por defecto), `copies` (1 a 5).
- `openDrawer`: abre el cajón de dinero al imprimir. **Apagado por defecto** y opcional. Se abre una sola vez aunque haya varias copias.
- `printerType`: `EPSON` (ESC/POS). Star no está implementado.
- `codePage` y `paper` (`widthMm`, `columns`: 80 mm = 48 columnas, 58 mm = 32).
- `connection`: `type` y los datos de cada tipo (`network`, `spooler`, `serial`). Se conservan los tres al cambiar de tipo.

Los datos del negocio (`business-config.json`): nombre, eslogan, NIT, dirección, teléfono, redes y mensaje de pie. NIT y dirección salen en el ticket solo si tienen valor.

## Agregar un tipo de conexión nuevo

1. Crear `transports/miTransporte.js` con una función que devuelva `{ send(buffer), check() }`.
2. Registrarla en `transports/transportRegistry.js` (y su función de descubrimiento si aplica).
3. Agregar el tipo a `CONNECTION_TYPES` y sus campos en `config/configSchema.js`.

El servicio, el ticket y el codificador no cambian.

## Pruebas

`npm test` ejecuta las pruebas con el ejecutor de Node (sin dependencias extra). Cubren validación de datos, ticket, bytes ESC/POS, configuración y migración, y los tres transportes (red contra un servidor local; spooler y serial con dobles).
