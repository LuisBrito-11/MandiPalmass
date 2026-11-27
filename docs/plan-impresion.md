# Plan de implementación: módulo de impresión de tickets POS

> **Estado (2026-11-27):** fases 0 a 4 implementadas. Pendiente: fase 5 (instalador y pruebas con la impresora real). Uso y API: [impresion.md](impresion.md).
>
> **Cambios respecto al plan original**
> - **Pruebas:** se usa `node --test` (incluido en Node) en lugar de vitest, para no sumar dependencias.
> - **Versiones:** el conflicto `@vitejs/plugin-react` 6 (pide vite 8) contra `electron-vite` 5 (admite hasta vite 7) se resolvió con vite 7 y `@vitejs/plugin-react` 5.2. Ya no hace falta `--legacy-peer-deps` y `electron-vite build` funciona.
> - **Cajón:** opcional y apagado por defecto (el dueño está acostumbrado a abrirlo a mano). Se abre una sola vez aunque haya varias copias.
> - **Solo ESC/POS:** `printerType` acepta únicamente `EPSON`. Star queda para después.
> - **Compatibilidad con la pantalla de Gabriel:** `getConfig` agrega `ipAddress`; `saveConfig` acepta el formato anterior y devuelve la configuración guardada o `false`; los fallos incluyen `error` además de `message`. Se pueden quitar cuando la pantalla nueva use el formato v2.
> - **Los handlers IPC** viven en `printing/printerIpc.js`, no en `src/main/ipc/`.
> - **ESLint:** se agregó un bloque con globales de Node para `src/main`, `src/preload` y `tests`.

## 1. Objetivo y límites

Que MandiPalmas imprima tickets en cualquier impresora térmica ESC/POS (Epson y compatibles) o Star, conectada por **red, USB, serial o Bluetooth**, empezando por la Digital POS DIG-E200i.

**Reparto del trabajo**
- **Impresión (este plan):** todo lo que pasa desde que la app pide "imprime este ticket" hasta que sale el papel.
- **Gabriel:** base de datos, diseño, pantallas y flujo de venta.

**Qué toca este plan**
- `src/main/printing/**`: carpeta nueva, propia del módulo.
- `src/main/index.js`: solo las líneas de los handlers de impresión, que se reemplazan por una llamada.
- `src/preload/index.js`: solo el bloque `printer`.
- `src/main/printer.js`: se elimina al final.
- `package.json` y `electron.vite.config.js`: dependencias de impresión y pruebas.

**Qué no toca:** base de datos (`src/main/database/**`), componentes y hooks de React, ni el flujo de cobro.

## 2. Principio clave: un contrato entre la app y la impresión

La impresión no consulta la base de datos ni depende de cómo se guarda un pedido. Recibe un objeto de datos del ticket (`TicketData`) por IPC, lo valida y lo imprime.

- Si Gabriel cambia la base de datos o las pantallas, solo tiene que seguir entregando ese objeto.
- Un **adaptador de entrada** (`ticketDataMapper.js`) acepta el formato que envía hoy `InvoiceModal.jsx` (`name`/`nombre`, `precioTotalItem`/`precio_unitario`, `tipo`/`modalidad`). Así la app actual sigue funcionando sin cambios.

### Contrato `TicketData`

```js
/**
 * @typedef {Object} TicketItem
 * @property {string} nombre
 * @property {number} cantidad
 * @property {number} precioUnitario   // precio del ítem con sus adiciones
 * @property {{ salsas?: string[], toppings?: string[], adiciones?: Array<{ nombre: string, cantidad: number, precio: number }> }} [personalizacion]
 *
 * @typedef {Object} TicketData
 * @property {number|string} numero
 * @property {string} fecha            // ISO 8601: la fecha del pedido guardado
 * @property {'mesa'|'local'|'llevar'|'domicilio'} tipo
 * @property {number|string|null} [mesa]
 * @property {TicketItem[]} items
 * @property {number} total
 * @property {string} metodoPago
 * @property {number} [recibido]
 * @property {number} [cambio]
 * @property {string} [direccion]
 * @property {string} [notas]
 */
```

Si faltan campos obligatorios o los tipos no cuadran, se responde con el error `DATOS_INVALIDOS` y el campo que falla. No se imprime un ticket a medias.

### API para la app (preload)

```js
window.api.printer.print(ticketData)    // se mantiene con el mismo nombre: la app actual no cambia
window.api.printer.testPrint()
window.api.printer.getConfig()
window.api.printer.saveConfig(config)   // acepta el formato viejo y el nuevo
window.api.printer.listDevices()        // nuevo: impresoras de Windows y puertos COM
window.api.printer.getBusiness()        // nuevo: datos del negocio del ticket
window.api.printer.saveBusiness(data)   // nuevo
```

Todas responden `{ success: true }` o `{ success: false, code, message }`.

## 3. Arquitectura del módulo

```
window.api.printer --> printerIpc --> printerService
                                          |
          +---------------+---------------+---------------+------------------+
          v               v               v               v                  v
   ticketDataMapper  ticketBuilder   escPosEncoder   transportRegistry   repositorios de config
   (valida y          (documento      (Buffer de      |                  (impresora, negocio)
    normaliza)         neutro)         bytes)         +-- network  (TCP 9100)
                                                      +-- spooler  (Windows RAW: USB)
                                                      +-- serial   (COM / Bluetooth)
```

| Principio | Cómo se aplica |
|---|---|
| Responsabilidad única | Validar datos, armar el ticket, codificar a bytes y enviar viven en piezas separadas |
| Abierto/cerrado | Agregar una conexión es registrar una fábrica nueva; el servicio no cambia |
| Liskov | Todos los transportes cumplen `send(buffer)` y `check()` y son intercambiables |
| Segregación de interfaces | El transporte solo sabe enviar bytes; el builder solo sabe de contenido |
| Inversión de dependencias | El servicio recibe todo por parámetro; se arma en `printing/index.js` |

### Estructura

```
src/main/printing/
  index.js                      Raíz de composición
  printerIpc.js                 Registro de handlers IPC
  printerService.js             Orquesta imprimir, prueba y listado de dispositivos
  printerErrors.js              PrinterError y códigos
  formatCurrency.js             Formato de moneda del ticket
  input/
    ticketDataMapper.js         Valida y normaliza TicketData (acepta el formato actual)
  config/
    configSchema.js             Valores por defecto, validación y migración v1 -> v2
    printerConfigRepository.js  printer-config.json
    businessConfigRepository.js business-config.json
  ticket/
    ticketBuilder.js            TicketData + negocio + diseño -> documento neutro
    testTicketBuilder.js        Ticket de prueba
    textUtils.js                Quitar emojis, ajustar a N columnas, separadores
  encoding/
    escPosEncoder.js            Documento neutro -> Buffer
  transports/
    transportRegistry.js
    networkTransport.js
    spoolerTransport.js
    spoolerScript.js            PowerShell + winspool (WritePrinter RAW)
    serialTransport.js
tests/printing/**               Pruebas con vitest
```

### Documento neutro

`ticketBuilder` produce este documento y `escPosEncoder` lo consume. No conoce ESC/POS.

```js
/** @typedef {{ type: 'text', text: string, align?: 'left'|'center'|'right', bold?: boolean, size?: 'normal'|'double' }} TextLine */
/** @typedef {{ type: 'row', columns: Array<{ text: string, align: 'left'|'center'|'right', width: number }> }} RowLine */
/** @typedef {{ type: 'separator' } | { type: 'feed', lines: number } | { type: 'cut' } | { type: 'drawer' }} ControlLine */
/** @typedef {{ lines: Array<TextLine|RowLine|ControlLine> }} TicketDocument */
```

### Errores

| Código | Cuándo |
|---|---|
| `DESACTIVADA` | La impresión está apagada en la configuración |
| `DATOS_INVALIDOS` | El `TicketData` no cumple el contrato |
| `CONFIG_INVALIDA` | Falta IP, nombre de impresora o puerto |
| `TIPO_NO_SOPORTADO` | Tipo de conexión desconocido |
| `CONEXION_RECHAZADA` | La IP no responde o rechaza el puerto |
| `TIEMPO_AGOTADO` | Sin respuesta a tiempo |
| `IMPRESORA_NO_ENCONTRADA` | La impresora de Windows o el puerto COM no existe |
| `ERROR_ENVIO` | Otra falla al enviar (con detalle en consola) |

### Configuración v2 (`printer-config.json`)

```json
{
  "version": 2,
  "enabled": true,
  "autoPrint": false,
  "copies": 1,
  "openDrawer": false,
  "printerType": "EPSON",
  "codePage": "PC850_MULTILINGUAL",
  "paper": { "widthMm": 80, "columns": 48 },
  "connection": {
    "type": "network",
    "network": { "host": "192.168.1.100", "port": 9100, "timeoutMs": 4000 },
    "spooler": { "printerName": "" },
    "serial":  { "path": "", "baudRate": 9600 }
  }
}
```

- **Migración automática desde v1** (`{ ipAddress, paperWidth, enabled }`): `saveConfig` también acepta el formato v1. Así la pantalla actual de administración sigue funcionando hasta que se agregue el selector de conexión.
- **Datos del negocio** en `business-config.json`. Por defecto llevan los valores que hoy están escritos en `printer.js` (nombre, eslogan, teléfono, redes, mensaje de pie). NIT y dirección quedan vacíos.

### Transportes

| Transporte | Cómo envía | Cubre | Dependencias |
|---|---|---|---|
| `network` | `net.Socket` a `host:port` con tiempo de espera | Impresoras con Ethernet o Wi-Fi | Ninguna |
| `spooler` | Buffer en archivo temporal y PowerShell (`-NoProfile -ExecutionPolicy Bypass`) que llama a `winspool.drv` con tipo `RAW` | USB y cualquier impresora instalada en Windows | Ninguna |
| `serial` | `serialport`: abrir, escribir, `drain`, cerrar | COM, USB-serial y Bluetooth clásico emparejado | `serialport` (nativo) |

- **Descubrimiento:** impresoras con `Get-CimInstance Win32_Printer`; puertos con `SerialPort.list()`.
- **Codificación:** `node-thermal-printer` 4.6.0 queda solo como codificador. Acepta una interfaz-objeto falsa y expone `getBuffer()`. Ya no maneja la conexión.

## 4. Fases

Cada fase deja la app funcionando y termina en commits pequeños en español, sin mención a IA.

### Fase 0: preparación
- Agregar `vitest` y el script `"test": "vitest run"`.
- Commit: `chore: agrega vitest para el módulo de impresión`

### Fase 1: núcleo con red (sin cambio visible)
1. `printerErrors.js`, `formatCurrency.js`.
2. `ticketDataMapper.js`, con validación y compatibilidad con el formato actual.
3. `configSchema.js` y los dos repositorios, con migración de v1.
4. `textUtils.js` y `ticketBuilder.js`: mismo contenido que hoy, con separadores al ancho real, sin emojis y datos del negocio desde la configuración.
5. `testTicketBuilder.js`: incluye la línea `ÑÁÉÍÓÚ ¿¡` y el tipo de conexión.
6. `escPosEncoder.js`, con página por defecto `PC850_MULTILINGUAL`.
7. `networkTransport.js` y `transportRegistry.js`.
8. `printerService.js`, `printerIpc.js` e `index.js`.
9. `src/main/index.js`: reemplazar los handlers de impresión por `registerPrinterIpc(ipcMain)`.
10. Eliminar `src/main/printer.js`.
- **Acepta si:** desde el modal actual, sin tocarlo, sale el mismo ticket por red, con separadores correctos y error con código si falla.
- **Commits:** uno por pieza (errores, entrada, configuración, builder, encoder, transporte de red, servicio, IPC, limpieza).

### Fase 2: spooler de Windows (USB)
1. `spoolerScript.js` y `spoolerTransport.js`.
2. `listDevices()` con las impresoras instaladas.
3. Exponer `listDevices` en el preload.
- **Acepta si:** la DIG-E200i por USB, instalada en Windows con su driver o con "Generic / Text Only", imprime la prueba y un pedido con tildes y corte.
- **Commits:**
  - `feat: transporte por spooler de Windows`
  - `feat: listado de impresoras instaladas`

### Fase 3: serial y Bluetooth
1. Agregar `serialport` y marcarlo como `external` en `electron.vite.config.js`. Verificar que se recompila para Electron 32, como `better-sqlite3`.
2. `serialTransport.js` y su descubrimiento.
- **Acepta si:** una impresora por COM o Bluetooth emparejado imprime la prueba.
- **Commits:**
  - `feat: transporte serial y Bluetooth por COM`

### Fase 4: copias, cajón y datos del negocio
1. El servicio envía `copies` veces y agrega `drawer` si `openDrawer` está activo.
2. Exponer `getBusiness` y `saveBusiness`.
- **Commits:**
  - `feat: copias y apertura de cajón`
  - `feat: datos del negocio configurables`

### Fase 5: empaquetado y prueba en hardware
- Generar el instalador e instalar en una PC limpia.
- Verificar que `serialport` cargue y que el spooler funcione desde la app instalada.
- Ejecutar las pruebas manuales con la DIG-E200i.
- Documentar en `docs/impresion.md` cómo configurar cada conexión y el contrato `TicketData`.

## 5. Pruebas

**Automáticas (vitest, sin hardware)**

| Pieza | Qué se prueba |
|---|---|
| `ticketDataMapper` | Acepta el formato actual y el del contrato; rechaza datos incompletos con el campo que falla |
| `textUtils` | Quita emojis, recorta y rellena a 32 y 48 columnas |
| `ticketBuilder` | Encabezado del negocio, mesa o modalidad, personalización, cambio solo en efectivo, observaciones, sin NIT si está vacío |
| `escPosEncoder` | Empieza con `ESC @` (`1B 40`), corta con `GS V` (`1D 56`), `Ñ` = `0xA5` en PC850, cajón con `ESC p` |
| `configSchema` | Migración v1 a v2, valores por defecto, rechazo de configuraciones inválidas |
| `networkTransport` | Contra un servidor `net` local: bytes exactos, `CONEXION_RECHAZADA`, `TIEMPO_AGOTADO` |
| `spoolerTransport` | Con un ejecutor falso: argumentos, borrado del temporal, código de salida a error |
| `transportRegistry` | Crea el transporte correcto o falla con `TIPO_NO_SOPORTADO` |
| `printerService` | Con dobles: desactivada, datos inválidos, copias, cajón, errores traducidos |

**Manuales con la DIG-E200i**
1. USB por spooler: prueba y pedido real.
2. Tildes, Ñ, ¿ y ¡.
3. 48 columnas sin cortes de línea raros.
4. Corte de papel.
5. Impresora apagada o desconectada: mensaje claro.
6. Copias y cajón.
7. Por red, si la impresora tiene Ethernet.

## 6. Puntos de integración con Gabriel

Estos cambios son de su parte. La impresión funciona sin ellos, pero los necesita para quedar completa.

| Tema | Qué se necesita | Por qué |
|---|---|---|
| Datos del ticket | Llamar a `printer.print` con los datos del **pedido guardado** (número y fecha de la BD) | Hoy el modal arma el ticket con la hora del render y con `contadorPedido` ya incrementado: imprime N+1 (`useCarrito.js:104`, `App.jsx:310`, `InvoiceModal.jsx:23`) |
| Impresión automática | Tras guardar la venta, si `getConfig().autoPrint` es verdadero, llamar a `printer.print`. Si falla, no deshacer la venta | El disparo vive en el flujo de cobro |
| Pantalla de configuración | Selector de conexión (red, USB, serial), lista de `listDevices()`, ancho, página de códigos, tipo de impresora, copias, cajón, datos del negocio y botón de prueba que muestre `message` | El toggle actual de "impresión automática" solo desactiva la impresora (`AdminMenuPage.jsx:282`) |
| Detalle observado | `InvoiceModal.jsx:18` hace `return` antes de `useState` | Rompe la regla de hooks de React |
| Detalle observado | Con internet, `createPedido` devuelve el id de Supabase y no el local (`dbManager.js:108`) | Relevante si luego se quiere reimprimir por id |

## 7. Riesgos

| Riesgo | Mitigación |
|---|---|
| La DIG-E200i podría usar otra página de códigos | La prueba imprime una línea de caracteres. Página y tipo son configurables |
| El driver del fabricante podría no aceptar RAW | Usar "Generic / Text Only" en su puerto USB |
| `serialport` es nativo y puede fallar al empaquetar | Mismo proceso que `better-sqlite3`; se verifica en la fase 5. USB sigue cubierto por el spooler |
| PowerShell bloqueado por políticas | `-ExecutionPolicy Bypass` por proceso. Si falla, `ERROR_ENVIO` con detalle |
| Cambios de Gabriel en el formato del pedido | Solo hay que ajustar `ticketDataMapper.js` |

## 8. Preguntas abiertas

1. ¿La DIG-E200i es solo USB, o también trae Ethernet?
2. ¿Hay que soportar impresoras Star, o basta con ESC/POS?
3. ¿Se usará cajón de dinero conectado a la impresora?
4. ¿La pantalla de configuración de impresión la hace Gabriel, o la hago yo como componente funcional y él la ubica y le da estilo?
