import { processDasData } from "../lib/das-parse"

describe("processDasData - Mercado Externo", () => {
  const sampleText = `
Apuração do Simples Nacional
2.1) Discriminativo de Receitas
Total de Receitas Brutas (R$)  Mercado Interno  Mercado Externo  Total
Receita Bruta do PA (RPA) - Competência  109.772,09  2.247,80  112.019,89
Receita bruta acumulada nos doze meses anteriores ao PA (RBT12)  1.421.027,76  6.067,44  1.427.095,20
Receita bruta acumulada no ano-calendário corrente (RBA)  421.910,85  2.247,80  424.158,65
Receita bruta acumulada no ano-calendário anterior (RBAA)  1.183.684,45  6.067,44  1.189.751,89
Limite de receita bruta proporcionalizado  4.800.000,00  4.800.000,00  4.800.000,00

2.2.1) Mercado Interno
01/2024  109.772,09
02/2024  98.000,00

2.2.2) Mercado Externo
01/2024  2.247,80
06/2024  6.067,44
`

  it("extrai colunas da seção 2.1 e série 2.2.2 com 4 casas", () => {
    const result = processDasData(sampleText)
    expect(result.success).toBe(true)

    const me = result.dados.receitas.mercadoExterno
    expect(me).toBeDefined()
    expect(me.rpa).toBeGreaterThan(0)
    expect(me.rbt12).toBeGreaterThan(0)
    expect(me.rba).toBeGreaterThan(0)
    expect(me.rbaa).toBeGreaterThan(0)

    const serieME = result.graficos.receitaLineExterno
    expect(serieME).toBeDefined()
    expect(serieME!.values.length).toBe(2)
    // Precisão 4 casas decimais
    expect(serieME!.values[0]).toBeCloseTo(2247.8, 4)
    expect(serieME!.valuesFormatados![0]).toBe("2247,8000")
  })
})
