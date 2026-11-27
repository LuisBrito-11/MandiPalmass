// Emojis y símbolos que las impresoras ESC/POS no pueden dibujar, más sus modificadores
// (selectores de variación, unión de emojis y marco de teclas), que van fuera de la clase de caracteres.
const EMOJI_PATTERN = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]|️|︎|‍|⃣/gu

/** Quita emojis y espacios sobrantes. Acepta valores no string. */
export function stripEmojis(text) {
  return String(text ?? '')
    .replace(EMOJI_PATTERN, '')
    .replace(/ {2,}/g, ' ')
    .trim()
}

/** Línea separadora del ancho exacto de la impresora. */
export function separatorLine(columns, char = '-') {
  return char.repeat(columns)
}

/** Corta un texto en líneas de máximo `width` caracteres, respetando palabras cuando se puede. */
export function wrapText(text, width) {
  const clean = String(text ?? '')
  if (width <= 0) return [clean]
  const lines = []
  for (const paragraph of clean.split('\n')) {
    let current = ''
    for (const word of paragraph.split(' ')) {
      let remaining = word
      while (remaining.length > width) {
        if (current) {
          lines.push(current)
          current = ''
        }
        lines.push(remaining.slice(0, width))
        remaining = remaining.slice(width)
      }
      if (!current) current = remaining
      else if (current.length + 1 + remaining.length <= width) current += ' ' + remaining
      else {
        lines.push(current)
        current = remaining
      }
    }
    lines.push(current)
  }
  return lines
}

/** Ajusta un texto a `width` caracteres alineándolo. Si no cabe lo recorta. */
export function fitText(text, width, align = 'left') {
  const s = String(text ?? '').slice(0, width)
  const free = width - s.length
  if (align === 'right') return ' '.repeat(free) + s
  if (align === 'center') {
    const left = Math.floor(free / 2)
    return ' '.repeat(left) + s + ' '.repeat(free - left)
  }
  return s + ' '.repeat(free)
}
