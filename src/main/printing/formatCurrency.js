/** Formato de moneda del ticket: "$ 12.500". Tolera valores no numéricos. */
export function formatCurrency(value) {
  const n = Number(value)
  const safe = Number.isFinite(n) ? n : 0
  return '$ ' + safe.toLocaleString('es-CO')
}
