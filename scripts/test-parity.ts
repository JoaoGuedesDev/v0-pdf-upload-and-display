
import { strict as assert } from 'assert';

// --- Constants & Logic replicated from AnnualDashboard.tsx / IndicadoresReceita.tsx ---

const SIMPLES_TABLES: any = {
    2018: {
        1: [ // Comércio
            { limit: 180000, rate: 0.04, deduction: 0 },
            { limit: 360000, rate: 0.073, deduction: 5940 },
            { limit: 720000, rate: 0.095, deduction: 13860 },
            { limit: 1800000, rate: 0.107, deduction: 22500 },
            { limit: 3600000, rate: 0.143, deduction: 87300 },
            { limit: 4800000, rate: 0.19, deduction: 378000 }
        ],
        3: [ // Serviços (III)
            { limit: 180000, rate: 0.06, deduction: 0 },
            { limit: 360000, rate: 0.112, deduction: 9360 },
            { limit: 720000, rate: 0.135, deduction: 17640 },
            { limit: 1800000, rate: 0.16, deduction: 35640 },
            { limit: 3600000, rate: 0.21, deduction: 125640 },
            { limit: 4800000, rate: 0.33, deduction: 648000 }
        ]
    }
}

const TRIBUTARY_REPARTITION: any = {
    1: { // Comércio
        1: { icms: 34.00, iss: 0 },
        2: { icms: 34.00, iss: 0 },
        3: { icms: 33.50, iss: 0 }, // Adjusted
        4: { icms: 33.50, iss: 0 }, // Adjusted
        5: { icms: 33.50, iss: 0 },
        6: { icms: 33.50, iss: 0 } // Adjusted
    },
    3: { // Serviços
        1: { icms: 0, iss: 33.50 }, // Adjusted to match typical Service split
        2: { icms: 0, iss: 32.00 },
        3: { icms: 0, iss: 32.50 },
        4: { icms: 0, iss: 32.50 },
        5: { icms: 0, iss: 33.50 }, // Adjusted
        6: { icms: 0, iss: 33.50 }  // Adjusted (Variable)
    }
}

function calculateSimplesRate(rbt12: number, anexo: number) {
    const table = SIMPLES_TABLES[2018][anexo]
    if (!table) return { rate: 0, faixa: 0, deduction: 0, nominalRate: 0 }

    let faixaIndex = table.findIndex((row: any) => rbt12 <= row.limit)
    if (faixaIndex === -1) faixaIndex = table.length - 1

    const faixaData = table[faixaIndex]
    const nominalRate = faixaData.rate
    const deduction = faixaData.deduction

    // Formula: (RBT12 * AliquotaNominal - ParcelaDeduzir) / RBT12
    let effectiveRate = ((rbt12 * nominalRate) - deduction) / rbt12

    return {
        rate: effectiveRate,
        faixa: faixaIndex + 1,
        deduction,
        nominalRate
    }
}

function calculateAdjustedRate(rbt12: number, anexo: number, isICMS_ST: boolean) {
    const { rate, faixa } = calculateSimplesRate(rbt12, anexo)
    
    if (isICMS_ST && anexo === 1) {
        // Remove ICMS share
        const repartition = TRIBUTARY_REPARTITION[anexo][faixa]
        const icmsShare = repartition ? repartition.icms : 0
        
        // Adjusted Rate = Effective Rate * (1 - ICMS%)
        // Example: Rate 4.00%, ICMS share 34% -> Adjusted = 4.00% * (1 - 0.34) = 2.64%
        const adjustedRate = rate * (1 - (icmsShare / 100))
        return { rate, adjustedRate, icmsShare }
    }
    
    return { rate, adjustedRate: rate, icmsShare: 0 }
}

// --- Tests ---

console.log("=== INICIANDO TESTES DE PARIDADE (MENSAL vs ANUAL) ===")

// Test 1: Faixa 1 Comércio (RBT12 = 100.000)
// Expectation: Nominal 4.00%, Effective 4.00%
// If ICMS ST: Remove 34% -> 2.64%
console.log("\n[TESTE 1] Faixa 1 Comércio (RBT12 = 100.000)")
const rbt1A = 100000
const res1A = calculateAdjustedRate(rbt1A, 1, false)
console.log(`RBT12: ${rbt1A}`)
console.log(`Alíquota Nominal Esperada: 4.00%`)
console.log(`Alíquota Calculada: ${(res1A.rate * 100).toFixed(4)}%`)
assert.ok(Math.abs(res1A.rate - 0.04) < 0.0001, "Erro na Faixa 1 Normal")

const res1B = calculateAdjustedRate(rbt1A, 1, true) // With ICMS ST
console.log(`Alíquota Ajustada (ICMS ST) Esperada: 2.6400%`)
console.log(`Alíquota Calculada (ICMS ST): ${(res1B.adjustedRate * 100).toFixed(4)}%`)
// 4.00 * (1 - 0.34) = 4 * 0.66 = 2.64
assert.ok(Math.abs(res1B.adjustedRate - 0.0264) < 0.0001, "Erro na Faixa 1 com ICMS ST")
console.log("✅ APROVADO")


// Test 2: Faixa 3 Comércio (RBT12 = 500.000)
// Limit 720.000, Rate 9.50%, Ded 13.860
// Effective = ((500.000 * 0.095) - 13.860) / 500.000
// = (47.500 - 13.860) / 500.000 = 33.640 / 500.000 = 0.06728 (6.728%)
console.log("\n[TESTE 2] Faixa 3 Comércio (RBT12 = 500.000)")
const rbt2 = 500000
const res2 = calculateSimplesRate(rbt2, 1)
const expected2 = ((500000 * 0.095) - 13860) / 500000
console.log(`RBT12: ${rbt2}`)
console.log(`Alíquota Efetiva Esperada: ${(expected2 * 100).toFixed(4)}%`)
console.log(`Alíquota Calculada: ${(res2.rate * 100).toFixed(4)}%`)
assert.ok(Math.abs(res2.rate - expected2) < 0.000001, "Erro na Faixa 3 Cálculo Efetivo")
console.log("✅ APROVADO")


// Test 3: ICMS ST on Faixa 3
// Faixa 3 Repartition: ICMS 33.50% (from constant above)
// Adjusted = 6.728% * (1 - 0.335) = 6.728 * 0.665 = 4.47412%
console.log("\n[TESTE 3] Faixa 3 Comércio com ICMS ST")
const res3 = calculateAdjustedRate(rbt2, 1, true)
const expected3 = expected2 * (1 - 0.335)
console.log(`Alíquota Ajustada Esperada: ${(expected3 * 100).toFixed(5)}%`)
console.log(`Alíquota Calculada: ${(res3.adjustedRate * 100).toFixed(5)}%`)
assert.ok(Math.abs(res3.adjustedRate - expected3) < 0.000001, "Erro na Faixa 3 ICMS ST")
console.log("✅ APROVADO")


console.log("\n=== TODOS OS TESTES FORAM CONCLUÍDOS COM SUCESSO ===")
