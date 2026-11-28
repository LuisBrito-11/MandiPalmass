import test from 'node:test'
import assert from 'node:assert/strict'
import { fitText, separatorLine, stripEmojis, wrapText } from '../../src/main/printing/ticket/textUtils.js'

test('stripEmojis quita emojis y conserva tildes, ñ y símbolos de puntuación', () => {
  assert.equal(stripEmojis('📞 300 5863581 · @MANDIPALMAS_'), '300 5863581 · @MANDIPALMAS_')
  assert.equal(stripEmojis('ESTADO: FUNCIONANDO 🟢'), 'ESTADO: FUNCIONANDO')
  assert.equal(stripEmojis('¿Qué año? Ñandú'), '¿Qué año? Ñandú')
  assert.equal(stripEmojis(undefined), '')
})

test('separatorLine usa el ancho exacto', () => {
  assert.equal(separatorLine(48).length, 48)
  assert.equal(separatorLine(32).length, 32)
})

test('wrapText respeta palabras y corta las muy largas', () => {
  assert.deepEqual(wrapText('uno dos tres cuatro', 9), ['uno dos', 'tres', 'cuatro'])
  assert.deepEqual(wrapText('abcdefghij', 4), ['abcd', 'efgh', 'ij'])
  assert.deepEqual(wrapText('', 10), [''])
})

test('fitText alinea y recorta', () => {
  assert.equal(fitText('ab', 5, 'right'), '   ab')
  assert.equal(fitText('ab', 5, 'center'), ' ab  ')
  assert.equal(fitText('abcdefgh', 5), 'abcde')
})
