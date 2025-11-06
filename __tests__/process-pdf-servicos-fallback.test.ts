import { processDasData } from "../lib/das-parse"

/**
 * Este teste valida dois pontos:
 * 1) O parser captura corretamente a descrição da atividade quando há caracteres especiais
 *    (travessão/aspas), não caindo em nome genérico.
 * 2) Os tributos extraídos permitem inferir o fallback de classificação:
 *    - Bloco com ISS > 0 e ICMS = 0 deve ser tratado como Serviços
 *    - Bloco com ICMS > 0 e ISS = 0 deve ser tratado como Mercadorias
 */
describe("Parser de PDF - fallback ISS/ICMS para classificação de atividades", () => {
  test("captura descrições e tributos e permite inferir Serviços vs Mercadorias", () => {
    const texto = [
      // Bloco de Mercadorias (interno)
      "Valor do Débito por Tributo para a Atividade (R$):",
      "Revenda de mercadorias, exceto para o exterior - Sem substituição tributária (utilizar opção ICMS)",
      "Receita Bruta Informada: R$ 19.819,30",
      "IRPJ CSLL COFINS PIS/Pasep INSS/CPP ICMS IPI ISS Total",
      "75,46 48,02 174,78 37,87 576,21 459,59 0,00 0,00 1.371,93",
      "",
      // Bloco de Serviços (interno) com travessão
      "Valor do Débito por Tributo para a Atividade (R$):",
      "Prestação de Serviços, exceto para o exterior — Não sujeitos ao fator 'r'",
      "Receita Bruta Informada: R$ 17.819,00",
      "IRPJ CSLL COFINS PIS/Pasep INSS/CPP ICMS IPI ISS Total",
      "72,84 63,73 248,38 53,90 790,29 0,00 0,00 591,81 1.820,95",
    ].join("\n")

    const res = processDasData(texto)
    expect(res.success).toBe(true)

    const atividades = (res as any)?.debug?.atividades || []
    expect(Array.isArray(atividades)).toBe(true)
    expect(atividades.length).toBe(2)

    const nomes = atividades.map((a: any) => String(a?.nome || ""))
    // Deve manter a linha inteira, incluindo travessão/aspas (não ser 'Atividade')
    expect(nomes[0].toLowerCase()).toContain("revenda de mercadorias")
    expect(nomes[1].toLowerCase()).toContain("prestação de serviços")

    const t0 = atividades[0].tributos
    const t1 = atividades[1].tributos
    // Mercadorias: ICMS > 0 e ISS = 0
    expect(Number(t0.icms)).toBeGreaterThan(0)
    expect(Number(t0.iss)).toBe(0)
    // Serviços: ISS > 0 e ICMS = 0
    expect(Number(t1.iss)).toBeGreaterThan(0)
    expect(Number(t1.icms)).toBe(0)

    // Mini agregador replicando a regra de fallback da UI
    const init = () => ({ IRPJ: 0, CSLL: 0, COFINS: 0, PIS_Pasep: 0, INSS_CPP: 0, ICMS: 0, IPI: 0, ISS: 0 })
    const sumMercadoriasInterno = init()
    const sumServicosInterno = init()

    for (const a of atividades) {
      const trib: any = a.tributos || {}
      const issVal = Number(trib.iss || 0)
      const icmsVal = Number(trib.icms || 0)
      const target = issVal > 0 && icmsVal === 0 ? sumServicosInterno : sumMercadoriasInterno
      target.IRPJ += Number(trib.irpj || 0)
      target.CSLL += Number(trib.csll || 0)
      target.COFINS += Number(trib.cofins || 0)
      target.PIS_Pasep += Number(trib.pis || 0)
      target.INSS_CPP += Number(trib.inss_cpp || 0)
      target.ICMS += Number(trib.icms || 0)
      target.IPI += Number(trib.ipi || 0)
      target.ISS += Number(trib.iss || 0)
    }

    expect(sumServicosInterno.ISS).toBeGreaterThan(0)
    expect(sumServicosInterno.ICMS).toBe(0)
    expect(sumMercadoriasInterno.ICMS).toBeGreaterThan(0)
    expect(sumMercadoriasInterno.ISS).toBe(0)
  })
})
