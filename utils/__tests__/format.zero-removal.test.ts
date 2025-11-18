import { fmtBRL } from '../format'

function expectEqual(a: any, b: any, msg: string) {
  if (a !== b) {
    throw new Error(`Test failed: ${msg}. Expected '${b}', got '${a}'`)
  }
}

// Zero should be removed
expectEqual(fmtBRL(0), '', 'fmtBRL should remove R$ 0,00')

// Positive values should be formatted
const v1 = fmtBRL(1234.56)
if (!/^R\$\s?1\.234,56$/.test(v1)) {
  throw new Error(`Test failed: positive format incorrect: '${v1}'`)
}

// Negative values should be formatted
const v2 = fmtBRL(-10)
if (!/^\-?R\$\s?10,00$/.test(v2)) {
  throw new Error(`Test failed: negative format incorrect: '${v2}'`)
}

// Non-finite should be removed
expectEqual(fmtBRL(Number.NaN), '', 'fmtBRL should remove NaN')
expectEqual(fmtBRL(Number.POSITIVE_INFINITY), '', 'fmtBRL should remove Infinity')

console.log('fmtBRL zero-removal tests passed')

