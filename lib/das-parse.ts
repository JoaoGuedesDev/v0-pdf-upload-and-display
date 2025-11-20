// Função pura de parsing do texto do DAS (sem dependências do Next.js)
export function processDasData(textRaw: string) {
  // Se o conteúdo for JSON estruturado (v5.x do n8n), tratamos diretamente
  const trimmed = String(textRaw || '').trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const payload = JSON.parse(trimmed)
      const obj = Array.isArray(payload) ? (payload[0] || {}) : payload

      const cab = obj.cabecalho || {}
      const disc = obj.discriminativo_receitas || {}
      const receitasAnt = obj.receitas_anteriores || {}
      const estabs = obj.estabelecimentos || []
      const estab0 = estabs[0] || {}
      const tot = (estab0.totais && estab0.totais.declarado) || null
      const atividades = Array.isArray(estab0.atividades) ? estab0.atividades : []

      // Utilitário numérico antes de qualquer uso
      const toNumber = (v: any) => typeof v === 'number' ? v : Number(v) || 0

      // Soma dos tributos das atividades, para fallback quando 'declarado' vier zerado
      const somaTributosAtividades = (() => {
        const acc = { irpj: 0, csll: 0, cofins: 0, pis: 0, inss_cpp: 0, icms: 0, ipi: 0, iss: 0 }
        for (const at of atividades) {
          const t = at?.tributos || {}
          acc.irpj += toNumber(t.irpj)
          acc.csll += toNumber(t.csll)
          acc.cofins += toNumber(t.cofins)
          acc.pis += toNumber(t.pis)
          acc.inss_cpp += toNumber(t.inss_cpp)
          acc.icms += toNumber(t.icms)
          acc.ipi += toNumber(t.ipi)
          acc.iss += toNumber(t.iss)
        }
        const total = acc.irpj + acc.csll + acc.cofins + acc.pis + acc.inss_cpp + acc.icms + acc.ipi + acc.iss
        return { ...acc, total }
      })()


      const rpaMi = toNumber(disc?.rpa?.mi)
      const rpaMe = toNumber(disc?.rpa?.me)
      const rpaTotal = toNumber(disc?.rpa?.total ?? (rpaMi + rpaMe))
      const rbt12Mi = toNumber(disc?.rbt12?.mi)
      const rbt12Me = toNumber(disc?.rbt12?.me)
      const rbt12Total = toNumber(disc?.rbt12?.total ?? (rbt12Mi + rbt12Me))
      const rbaMi = toNumber(disc?.rba?.mi)
      const rbaMe = toNumber(disc?.rba?.me)
      const rbaTotal = toNumber(disc?.rba?.total ?? (rbaMi + rbaMe))
      const rbaaMi = toNumber(disc?.rbaa?.mi)
      const rbaaMe = toNumber(disc?.rbaa?.me)
      const rbaaTotal = toNumber(disc?.rbaa?.total ?? (rbaaMi + rbaaMe))
      const limiteMi = toNumber(disc?.limite_proporcionalizado?.mi)
      const limiteMe = toNumber(disc?.limite_proporcionalizado?.me)

      const historicoMI = Array.isArray(receitasAnt?.mercado_interno) ? receitasAnt.mercado_interno : []
      const historicoME = Array.isArray(receitasAnt?.mercado_externo) ? receitasAnt.mercado_externo : []

      // Utilitários para agregação a partir das séries mensais
      const parseMes = (s: string) => {
        const [mm, yy] = String(s || '').split('/')
        return { month: Number(mm), year: Number(yy) }
      }
      const sortByDate = (arr: any[]) => [...arr].sort((a, b) => {
        const pa = parseMes(a.mes), pb = parseMes(b.mes)
        return pa.year === pb.year ? pa.month - pb.month : pa.year - pb.year
      })
      const somaUltimos12 = (arr: any[]) => {
        const ordenado = sortByDate(arr)
        const ultimos = ordenado.slice(Math.max(ordenado.length - 12, 0))
        return ultimos.reduce((acc, p) => acc + (toNumber(p.valor) || 0), 0)
      }
      const anoFim = (() => {
        const fim = cab?.periodo?.fim
        if (typeof fim === 'string' && /\d{2}\/\d{4}/.test(fim)) return parseMes(fim).year
        const anos = [...historicoMI, ...historicoME].map((p: any) => parseMes(p.mes).year).filter(Boolean)
        return anos.length ? Math.max(...anos) : new Date().getFullYear()
      })()
      const somaAno = (arr: any[], year: number) => arr
        .filter((p: any) => parseMes(p.mes).year === year)
        .reduce((acc, p) => acc + (toNumber(p.valor) || 0), 0)

      // Somatórios vindos das séries
      const rbt12MiSerie = somaUltimos12(historicoMI)
      const rbt12MeSerie = somaUltimos12(historicoME)
      const rbaMiSerie = somaAno(historicoMI, anoFim)
      const rbaMeSerie = somaAno(historicoME, anoFim)
      const rbaaMiSerie = somaAno(historicoMI, anoFim - 1)
      const rbaaMeSerie = somaAno(historicoME, anoFim - 1)

      const totVals = tot ? [toNumber(tot.irpj), toNumber(tot.csll), toNumber(tot.cofins), toNumber(tot.pis), toNumber(tot.inss_cpp), toNumber(tot.icms), toNumber(tot.ipi), toNumber(tot.iss)] : []
      const totIsZero = !tot || totVals.every((v) => (toNumber(v) || 0) === 0)

      const tribDecl = !totIsZero ? {
        IRPJ: toNumber(tot!.irpj),
        CSLL: toNumber(tot!.csll),
        COFINS: toNumber(tot!.cofins),
        PIS_Pasep: toNumber(tot!.pis),
        INSS_CPP: toNumber(tot!.inss_cpp),
        ICMS: toNumber(tot!.icms),
        IPI: toNumber(tot!.ipi),
        ISS: toNumber(tot!.iss),
        Total: toNumber(tot!.total),
      } : {
        IRPJ: toNumber(somaTributosAtividades.irpj),
        CSLL: toNumber(somaTributosAtividades.csll),
        COFINS: toNumber(somaTributosAtividades.cofins),
        PIS_Pasep: toNumber(somaTributosAtividades.pis),
        INSS_CPP: toNumber(somaTributosAtividades.inss_cpp),
        ICMS: toNumber(somaTributosAtividades.icms),
        IPI: toNumber(somaTributosAtividades.ipi),
        ISS: toNumber(somaTributosAtividades.iss),
        Total: toNumber(somaTributosAtividades.total),
      }

      const valorDAS = tribDecl.Total

      const moneyBR = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

      const aliquotaEfetiva = (valorDAS > 0 && rpaTotal > 0) ? (valorDAS / rpaTotal) * 100 : 0
      const margemLiquida = rpaTotal > 0 ? ((rpaTotal - valorDAS) / rpaTotal) * 100 : 0

      const formatPercent1 = (v: number) => `${v.toFixed(1)}%`

      // Inferência de cenário (serviços, mercadorias ou misto) para JSON
      const cenario = (() => {
        const nomes = (Array.isArray(atividades) ? atividades : []).map((a: any) => String(a?.nome || a?.name || a?.descricao || '').toLowerCase())
        const temServicos = nomes.some((n) => n.includes('servi'))
        const temMercadorias = nomes.some((n) => !n.includes('servi'))
        if (temServicos && temMercadorias) return 'misto'
        if (temServicos) return 'servicos'
        if (temMercadorias) return 'mercadorias'
        const iss = tribDecl.ISS || 0
        const icms = tribDecl.ICMS || 0
        if (iss > 0 && icms > 0) return 'misto'
        if (iss > 0) return 'servicos'
        if (icms > 0) return 'mercadorias'
        return 'misto'
      })()

      return {
        success: true,
        dados: {
          identificacao: {
            cnpj: cab.cnpj_matriz || '',
            razaoSocial: cab.nome_empresarial || '',
            periodoApuracao: cab.periodo ? `${cab.periodo.inicio} a ${cab.periodo.fim}` : '',
            abertura: cab.data_abertura || '',
            municipio: (Array.isArray(estabs) && estab0.municipio) || '',
            uf: (Array.isArray(estabs) && estab0.uf) || '',
          },
          receitas: {
            receitaPA: rpaTotal,
            // Total: usa discriminativo quando presente; caso contrário, soma das séries
            rbt12: (rbt12Total || 0) > 0 ? rbt12Total : (rbt12MiSerie + rbt12MeSerie),
            rba: (rbaTotal || 0) > 0 ? rbaTotal : (rbaMiSerie + rbaMeSerie),
            rbaa: (rbaaTotal || 0) > 0 ? rbaaTotal : (rbaaMiSerie + rbaaMeSerie),
            limite: limiteMi || limiteMe || 0,
            receitaPAFormatada: moneyBR(rpaTotal),
            mercadoExterno: {
              rpa: rpaMe || 0,
              // Prioriza o discriminativo (mais confiável), com fallback para série
              rbt12: (rbt12Me || 0) > 0 ? rbt12Me : (rbt12MeSerie || 0),
              rba: (rbaMe || 0) > 0 ? rbaMe : (rbaMeSerie || 0),
              rbaa: (rbaaMe || 0) > 0 ? rbaaMe : (rbaaMeSerie || 0),
              limite: limiteMe || 0,
            },
          },
          tributos: tribDecl,
          cenario,
          valorTotalDAS: valorDAS,
          valorTotalDASFormatado: moneyBR(valorDAS),
          calculos: {
            aliquotaEfetiva: +aliquotaEfetiva.toFixed(1),
            aliquotaEfetivaFormatada: formatPercent1(aliquotaEfetiva),
            margemLiquida: +margemLiquida.toFixed(3),
          },
          historico: {
            mercadoInterno: historicoMI.map((p: any) => ({ mes: p.mes, valor: toNumber(p.valor) })),
            mercadoExterno: historicoME.map((p: any) => ({ mes: p.mes, valor: toNumber(p.valor) })),
          },
        },
        graficos: {
          tributosBar: {
            labels: ["IRPJ", "CSLL", "COFINS", "PIS/Pasep", "INSS/CPP", "ICMS", "IPI", "ISS"],
            values: [
              tribDecl.IRPJ,
              tribDecl.CSLL,
              tribDecl.COFINS,
              tribDecl.PIS_Pasep,
              tribDecl.INSS_CPP,
              tribDecl.ICMS,
              tribDecl.IPI,
              tribDecl.ISS,
            ],
          },
          dasPie: {
            labels: ["IRPJ", "CSLL", "COFINS", "PIS/Pasep", "INSS/CPP", "ICMS", "IPI", "ISS"],
            values: [
              tribDecl.IRPJ,
              tribDecl.CSLL,
              tribDecl.COFINS,
              tribDecl.PIS_Pasep,
              tribDecl.INSS_CPP,
              tribDecl.ICMS,
              tribDecl.IPI,
              tribDecl.ISS,
            ],
          },
          receitaLine: {
            labels: (historicoMI || []).map((p: any) => p.mes),
            values: (historicoMI || []).map((p: any) => toNumber(p.valor)),
          },
          receitaLineExterno: (historicoME || []).length > 0 ? {
            labels: (historicoME || []).map((p: any) => p.mes),
            values: (historicoME || []).map((p: any) => +toNumber(p.valor).toFixed(4)),
            valuesFormatados: (historicoME || []).map((p: any) => toNumber(p.valor).toFixed(4).replace('.', ',')),
          } : undefined,
        },
        debug: {
          secao21: {
            rpaRow: { mi: rpaMi, me: rpaMe, total: rpaTotal },
            rbt12Row: { mi: rbt12Mi, me: rbt12Me, total: rbt12Total },
            rbaRow: { mi: rbaMi, me: rbaMe, total: rbaTotal },
            rbaaRow: { mi: rbaaMi, me: rbaaMe, total: rbaaTotal },
            limiteRow: { mi: limiteMi, me: limiteMe, total: limiteMi },
          },
          series: {
            miCount: (historicoMI || []).length,
            meCount: (historicoME || []).length,
          },
          // Expõe atividades do estabelecimento para a UI detalhar por categoria
          atividades: (atividades || []).map((a: any) => ({
            nome: a?.nome ?? a?.name ?? a?.descricao ?? '',
            receita_bruta_informada: toNumber(a?.receita_bruta_informada),
            tributos: {
              irpj: toNumber(a?.tributos?.irpj),
              csll: toNumber(a?.tributos?.csll),
              cofins: toNumber(a?.tributos?.cofins),
              pis: toNumber(a?.tributos?.pis),
              inss_cpp: toNumber(a?.tributos?.inss_cpp),
              icms: toNumber(a?.tributos?.icms),
              ipi: toNumber(a?.tributos?.ipi),
              iss: toNumber(a?.tributos?.iss),
              total: toNumber(a?.tributos?.total),
            },
            parcelas: Array.isArray(a?.parcelas) ? a.parcelas : undefined,
          })),
          // Compatibiliza com a leitura atual da UI: debug.parcelas.totais.declarado
          parcelas: {
            totais: {
              declarado: tot ? {
                irpj: toNumber(tot.irpj),
                csll: toNumber(tot.csll),
                cofins: toNumber(tot.cofins),
                pis: toNumber(tot.pis),
                inss_cpp: toNumber(tot.inss_cpp),
                icms: toNumber(tot.icms),
                ipi: toNumber(tot.ipi),
                iss: toNumber(tot.iss),
                total: toNumber(tot.total),
              } : undefined,
            }
          }
        },
        metadata: {
          processadoEm: new Date().toISOString(),
          versao: '1.2',
          fonte: 'PGDAS-D JSON v5',
        },
      }
    } catch (e) {
      // Se falhar, cai para o parser de texto abaixo
    }
  }

  // Parser de TEXTO (legado)
  const text = String(textRaw)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim()

  const clean = (s: any) => String(s || "").trim()
  const brToFloat = (s: any): number => {
    if (!s) return 0
    const cleaned = String(s)
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
    return Number.parseFloat(cleaned) || 0
  }
  const moneyBR = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

  const periodo = (text.match(/Per[ií]odo de Apura[cç][aã]o:\s*([0-9/]+\s*a\s*[0-9/]+)/i) || ["", ""])[1]
  const cnpj = (text.match(/CNPJ(?:\s+(?:Matriz|Estabelecimento))?:\s*([\d./-]+)/i) || ["", ""])[1]

  let razaoSocial = ""
  const razaoMatch = text.match(
    /Nome empresarial:\s*([A-ZÀ-Ü][A-ZÀ-Ü\s.&-]+?)(?:\s+Data de abertura|\s+CNPJ|\s+Optante|\s+\d)/i,
  )
  if (razaoMatch) {
    razaoSocial = clean(razaoMatch[1])
  }

  const abertura = (text.match(/Data de abertura no CNPJ:\s*([0-9/]+)/i) || ["", ""])[1]

  let municipio = "",
    uf = ""
  const mMatch = text.match(/Munic[ií]pio:\s*([A-ZÀ-ÜÂ-ÔÇÉÍÓÚÃÕà-üâ-ôçéíóúãõ\- ]+)\s*UF:\s*([A-Z]{2})/i)
  if (mMatch) {
    municipio = clean(matchStr(mMatch, 1))
    uf = clean(matchStr(mMatch, 2))
  }

  function matchStr(m: RegExpMatchArray, idx: number): string {
    return m[idx] || ""
  }

  // Totais
  let rpa = ""
  const rpaMatch = text.match(
    /Receita Bruta do PA[^\n]*?((?:\d{1,3}(?:\.\d{3})*,\d{2})(?:.*?(\d{1,3}(?:\.\d{3})*,\d{2})){0,2})/i,
  )
  if (rpaMatch) {
    const todos = rpaMatch[1].match(/\d{1,3}(?:\.\d{3})*,\d{2}/g) || []
    rpa = todos[todos.length - 1] || ""
  }
  if (!rpa) {
    rpa = (text.match(/Receita Bruta do PA.*?(\d{1,3}(?:\.\d{3})*,\d{2})/i) || ["", ""])[1]
  }
  if (!rpa) {
    const secao21 = text.match(/2\.1\)[\s\S]*?(\d{1,3}(?:\.\d{3})*,\d{2})/i)
    if (secao21) rpa = secao21[1]
  }
  if (!rpa) {
    rpa = (text.match(/Total da Receita Bruta.*?(\d{1,3}(?:\.\d{3})*,\d{2})/i) || ["", ""])[1]
  }

  const rbt12 = (text.match(/RBT12\)\s*([\d.]+,\d{2})/i) || ["", ""])[1]
  const rba = (text.match(/RBA\)\s*([\d.]+,\d{2})/i) || ["", ""])[1]
  const rbaa = (text.match(/RBAA\)\s*([\d.]+,\d{2})/i) || ["", ""])[1]
  const limite = (text.match(/Limite de receita bruta proporcionalizado\s*([\d.]+,\d{2})/i) || ["", ""])[1]

  const extractColumns = (labelRE: RegExp) => {
    // Busca um trecho maior após o rótulo para capturar números mesmo com quebras de linha largas
    const seg = text.match(new RegExp(labelRE.source + "[\\s\\S]{0,360}", "i"))
    if (!seg) return null
    const nums = seg[0].match(/\d{1,3}(?:\.\d{3})*,\d{2}/g) || []
    if (nums.length < 1) return null
    // Em alguns PDFs, quando Mercado Externo é zero, a linha traz apenas MI e Total (2 números).
    // Nesses casos, o segundo número é o Total e ME deve ser 0.
    if (nums.length === 2) {
      const mi = nums[0]
      const total = nums[1]
      const me = "0,00"
      return { mi: brToFloat(mi), me: brToFloat(me), total: brToFloat(total), raw: nums }
    }
    // Quando há três ou mais números, assume-se MI, ME e Total nas três primeiras posições.
    const mi = nums[0]
    const me = nums[1] || "0,00"
    const total = nums[2] || nums[nums.length - 1]
    const miF = brToFloat(mi)
    const meF = brToFloat(me)
    let totalF = brToFloat(total)
    const allF = nums.map(brToFloat).filter((v) => isFinite(v))
    // Garantir que Total seja válido e >= MI/ME; caso contrário, usar o maior valor do segmento
    if (!isFinite(totalF) || totalF < miF || totalF < meF) {
      totalF = Math.max(...allF, miF, meF)
    }
    return { mi: miF, me: meF, total: totalF, raw: nums }
  }

  // Tornar os padrões resilientes a quebras e espaçamentos variáveis, casando pelos acrônimos
  const rowRPA = extractColumns(/\(RPA\)/i)
  const rowRBT12 = extractColumns(/\(RBT12\)/i)
  const rowRBA = extractColumns(/\(RBA\)/i)
  const rowRBAA = extractColumns(/\(RBAA\)/i)
  const rowLimite = extractColumns(/Limite de receita bruta proporcionalizado/i)

  let tributos = {
    IRPJ: 0,
    CSLL: 0,
    COFINS: 0,
    PIS_Pasep: 0,
    INSS_CPP: 0,
    ICMS: 0,
    IPI: 0,
    ISS: 0,
    Total: 0,
  }

  const headerRE = /IRPJ\s+CSLL\s+COFINS\s+PIS\/?PASE?P\s+(?:INSS\/CPP|CPP)\s+ICMS\s+IPI\s+ISS\s+Total/i
  const headerMatch = text.match(new RegExp(headerRE.source + "[\\s\\S]{0,100}?\n([0-9.,\\s]+)", "i"))

  let nums: string[] = []
  if (headerMatch) {
    const tribLine = headerMatch[1]
    nums = tribLine.match(/\d{1,3}(?:\.\d{3})*,\d{2}/g) || []
  }
  if (nums.length < 8) {
    const bloco = text.match(/Totais do Estabelecimento[\s\S]{0,300}?\n([0-9.,\s]+)\n/i)
    if (bloco) {
      nums = bloco[1].match(/\d{1,3}(?:\.\d{3})*,\d{2}/g) || []
    }
  }
  if (nums.length < 8) {
    const bloco = text.match(/2\.8\)[\s\S]*?Total do D[eé]bito[\s\S]{0,300}?\n([0-9.,\s]+)\n/i)
    if (bloco) {
      nums = bloco[1].match(/\d{1,3}(?:\.\d{3})*,\d{2}/g) || []
    }
  }
  if (nums.length >= 8) {
    const [IRPJ, CSLL, COFINS, PIS, INSS, ICMS, IPI, ISS] = nums
    tributos = {
      IRPJ: brToFloat(IRPJ),
      CSLL: brToFloat(CSLL),
      COFINS: brToFloat(COFINS),
      PIS_Pasep: brToFloat(PIS),
      INSS_CPP: brToFloat(INSS),
      ICMS: brToFloat(ICMS),
      IPI: brToFloat(IPI),
      ISS: brToFloat(ISS),
      Total: [IRPJ, CSLL, COFINS, PIS, INSS, ICMS, IPI, ISS].map(brToFloat).reduce((a, b) => a + b, 0),
    }
  }

  const valorDAS = tributos.Total
  const formatPercent1 = (v: number) => `${v.toFixed(1)}%`

  // Inferência de cenário para TEXTO (sem atividades)
  const cenarioTexto = (() => {
    const iss = tributos.ISS || 0
    const icms = tributos.ICMS || 0
    if (iss > 0 && icms > 0) return 'misto'
    if (iss > 0) return 'servicos'
    if (icms > 0) return 'mercadorias'
    return 'misto'
  })()

  const sliceBetween = (str: string, startRE: RegExp, endRE?: RegExp) => {
    const start = str.search(startRE)
    if (start < 0) return ""
    const sub = str.slice(start)
    const endIdx = endRE ? sub.search(endRE) : -1
    return endIdx > 0 ? sub.slice(0, endIdx) : sub
  }

  // Extrai Mercado Interno (2.2.1) com padrões mais tolerantes (parênteses opcionais)
  let blocoMI = sliceBetween(text, /2\.2\.1\)?\s*Mercado Interno/i, /2\.2\.2\)?\s*Mercado Externo/i)
  // Fallback: se não capturou nada, tenta ampliar janelas ao redor
  if (!blocoMI || blocoMI.length < 10) {
    const bloco22 = sliceBetween(text, /2\.2\)\s*Receitas Brutas Anteriores/i, /\n\s*2\.[0-9]+\)/)
    const startIdx = bloco22.search(/2\.2\.1\)?\s*Mercado Interno/i)
    const endIdx = bloco22.search(/2\.2\.2\)?\s*Mercado Externo/i)
    if (startIdx >= 0 && endIdx > startIdx) {
      blocoMI = bloco22.slice(startIdx, endIdx)
    }
  }
  // Aceita ausência de espaço entre MM/YYYY e valor: usa \s* em vez de \s+
  const pares = [...(blocoMI || '').matchAll(/(\d{2}\/\d{4})\s*((?:\d{1,3}(?:\.\d{3})+|\d+),(?:\d{2}))/g)]
    .map((m) => ({ mes: m[1], valor: brToFloat(m[2]), valorStr: m[2] }))

  const blocoME = sliceBetween(text, /2\.2\.2\)?\s*Mercado Externo/i, /\n\s*2\.[0-9]+\)/)
  const paresME = [...blocoME.matchAll(/(\d{2}\/\d{4})\s*((?:\d{1,3}(?:\.\d{3})+|\d+),(?:\d{2,4}))/gm)]
    .map((m) => {
      const mes = m[1]
      const raw = m[2]
      const val = brToFloat(raw)
      if (!isFinite(val) || val <= 0) return null
      return { mes, valor: val, valorStr: raw, valorFormatado4d: val.toFixed(4).replace('.', ',') }
    })
    .filter(Boolean) as { mes: string; valor: number; valorFormatado4d: string }[]

  const receitaPA = brToFloat(rpa)
  const aliquotaEfetiva = (valorDAS > 0 && receitaPA > 0) ? (valorDAS / receitaPA) * 100 : 0
  const margemLiquida = receitaPA > 0 ? ((receitaPA - valorDAS) / receitaPA) * 100 : 0

  // Extrai blocos de "Valor do Débito por Tributo para a Atividade" com valores por tributo
  // Isso permite alimentar a UI com debug.atividades mesmo quando o insumo é somente o PDF em texto
  const atividadesFromTexto = (() => {
    const blocks: { nome: string; tributos: any; receita_bruta_informada?: number; parcelas?: any }[] = []

    // Regex para localizar cada seção de atividade e capturar uma janela de texto subsequente
    const atividadeRE = /Valor do D[eé]bito por Tributo para a Atividade \(R\$\):[\s\S]*?(?:\n|\r\n)/gi
    const matches: number[] = []
    let m: RegExpExecArray | null
    while ((m = atividadeRE.exec(text)) !== null) {
      matches.push(m.index)
    }

    const getSlice = (start: number, nextStart?: number) => {
      const end = typeof nextStart === 'number' ? nextStart : text.length
      // Amplia a janela para garantir captura completa dos valores mesmo em PDFs com espaçamento grande
      return text.slice(start, Math.min(end, start + 3000))
    }

    for (let i = 0; i < matches.length; i++) {
      const start = matches[i]
      const nextStart = matches[i + 1]
      const slice = getSlice(start, nextStart)

      // Descrição da atividade (linha após o título)
      const descMatch = slice.match(/\n\s*([A-ZÀ-Üa-zà-ü0-9 ,.'()\/-]+?)\s*\n/i)
      const nome = descMatch ? descMatch[1].trim() : 'Atividade'
      // Fallback: se a regex acima falhar por caracteres especiais, captura a linha inteira
      const altDescMatch = slice.match(/\n\s*([^\r\n]+?)\s*\r?\n/)
      const nomeSafe = altDescMatch ? altDescMatch[1].trim() : nome

      // Receita Bruta Informada (se disponível)
      const rbi = (slice.match(/Receita Bruta Informada:\s*R\$\s*((?:\d{1,3}(?:\.\d{3})*),\d{2})/i) || ["", ""])[1]
      const receitaBrutaInformada = rbi ? brToFloat(rbi) : undefined

      // Linha de cabeçalho dos tributos e linha de valores logo abaixo
      // Captura a sequência de 9 valores (8 tributos + Total) respeitando a ordem padrão
      const valoresMatch = slice.match(/IRPJ\s+CSLL\s+COFINS\s+PIS\/?PASEP\s+INSS\/CPP\s+ICMS\s+IPI\s+ISS\s+Total[\s\S]*?\n\s*((?:\d{1,3}(?:\.\d{3})*,\d{2})(?:\s+\|?\s*(?:\d{1,3}(?:\.\d{3})*,\d{2})){8})/i)
      let tributosVals: number[] | null = null
      if (valoresMatch && valoresMatch[1]) {
        const nums = valoresMatch[1].match(/\d{1,3}(?:\.\d{3})*,\d{2}/g) || []
        if (nums.length >= 9) {
          tributosVals = nums.slice(0, 9).map(brToFloat)
        }
      } else {
        // Fallback: captura a próxima linha que contenha ao menos 8 valores monetários
        const fallbackNums = (slice.match(/\n\s*((?:\d{1,3}(?:\.\d{3})*,\d{2})(?:.*?(?:\d{1,3}(?:\.\d{3})*,\d{2})){7,})/i) || ["", ""])[1]
        const nums = fallbackNums ? (fallbackNums.match(/\d{1,3}(?:\.\d{3})*,\d{2}/g) || []) : []
        if (nums.length >= 9) tributosVals = nums.slice(0, 9).map(brToFloat)
      }

      if (tributosVals && tributosVals.length >= 9) {
        const [irpj, csll, cofins, pis, inss, icms, ipi, iss, total] = tributosVals
        const tributos = { irpj, csll, cofins, pis, inss_cpp: inss, icms, ipi, iss, total }
        blocks.push({ nome: nomeSafe, tributos, receita_bruta_informada: receitaBrutaInformada })
      }
    }

    // Fallback adicional: se nenhum bloco com indicação de exterior tiver valores,
    // tenta localizar diretamente o trecho cujo nome contém "exterior" e extrai 9 números subsequentes
    const hasExteriorWithValues = blocks.some(b => {
      const t = String(b.nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      const posExterior = /(para\s+o\s+exterior|para\s+exterior|mercado\s+externo|exterior|externo)/.test(t)
      const total = Number(b?.tributos?.total || 0)
      return posExterior && total > 0
    })
    if (!hasExteriorWithValues) {
      const exteriorBlocks = [...text.matchAll(/Valor do D[eé]bito[^\n]*\n\s*([^\n]*exterior[^\n]*)[\s\S]{0,3000}/gi)]
      for (const m of exteriorBlocks) {
        const window = m[0] || ''
        const nums = window.match(/\d{1,3}(?:\.\d{3})*,\d{2}/g) || []
        if (nums.length >= 9) {
          const [irpj, csll, cofins, pis, inss, icms, ipi, iss, total] = nums.slice(0, 9).map(brToFloat)
          const nome = (m[1] || 'Atividade para o exterior').trim()
          const tributos = { irpj, csll, cofins, pis, inss_cpp: inss, icms, ipi, iss, total }
          // Evita duplicar se já houver um bloco igual
          const exists = blocks.some(b => String(b.nome).trim() === nome)
          if (!exists && (irpj + csll + cofins + pis + inss + icms + ipi + iss) > 0) {
            blocks.push({ nome, tributos })
          }
        }
      }
    }

    return blocks
  })()

  const toKey = (s: string) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const isExt = (nome: string) => /(para\s+o\s+exterior|para\s+exterior|mercado\s+externo|exterior|externo)/.test(toKey(nome))
  const isServ = (nome: string) => /(servico|servicos|prestacao)/.test(toKey(nome))
  const baseMap = () => ({ IRPJ: 0, CSLL: 0, COFINS: 0, PIS_PASEP: 0, INSS_CPP: 0, ICMS: 0, IPI: 0, ISS: 0 })
  const addTrib = (map: any, t: any) => {
    map.IRPJ += Number(t?.irpj || 0)
    map.CSLL += Number(t?.csll || 0)
    map.COFINS += Number(t?.cofins || 0)
    map.PIS_PASEP += Number(t?.pis || 0)
    map.INSS_CPP += Number(t?.inss_cpp || 0)
    map.ICMS += Number(t?.icms || 0)
    map.IPI += Number(t?.ipi || 0)
    map.ISS += Number(t?.iss || 0)
  }
  const mInt = baseMap()
  const mExt = baseMap()
  const sInt = baseMap()
  const sExt = baseMap()
  for (const b of atividadesFromTexto) {
    const nome = String(b?.nome || '')
    const ext = isExt(nome)
    const serv = isServ(nome)
    if (serv && ext) addTrib(sExt, b?.tributos)
    else if (serv && !ext) addTrib(sInt, b?.tributos)
    else if (!serv && ext) addTrib(mExt, b?.tributos)
    else addTrib(mInt, b?.tributos)
  }

  return {
    success: true,
    dados: {
      identificacao: { cnpj, razaoSocial, periodoApuracao: periodo, abertura, municipio, uf },
      receitas: {
        receitaPA: receitaPA,
        // Fallback para totais da própria linha da seção 2.1 quando correspondência direta falhar
        rbt12: brToFloat(rbt12) || (rowRBT12?.total || 0),
        rba: brToFloat(rba) || (rowRBA?.total || 0),
        rbaa: brToFloat(rbaa) || (rowRBAA?.total || 0),
        limite: brToFloat(limite) || (rowLimite?.total || 0),
        receitaPAFormatada: moneyBR(receitaPA),
        mercadoExterno: {
          rpa: rowRPA?.me || 0,
          rbt12: rowRBT12?.me || 0,
          rba: rowRBA?.me || 0,
          rbaa: rowRBAA?.me || 0,
          limite: rowLimite?.me || 0,
        },
      },
      tributos,
      tributosMercadoriasInterno: mInt,
      tributosMercadoriasExterno: mExt,
      tributosServicosInterno: sInt,
      tributosServicosExterno: sExt,
      cenario: cenarioTexto,
      valorTotalDAS: valorDAS,
      valorTotalDASFormatado: moneyBR(valorDAS),
      calculos: {
        aliquotaEfetiva: +aliquotaEfetiva.toFixed(1),
        aliquotaEfetivaFormatada: formatPercent1(aliquotaEfetiva),
        margemLiquida: +margemLiquida.toFixed(3),
      },
      historico: { mercadoInterno: pares, mercadoExterno: paresME },
    },
    graficos: {
      tributosBar: {
        labels: ["IRPJ", "CSLL", "COFINS", "PIS/Pasep", "INSS/CPP", "ICMS", "IPI", "ISS"],
        values: [
          tributos.IRPJ,
          tributos.CSLL,
          tributos.COFINS,
          tributos.PIS_Pasep,
          tributos.INSS_CPP,
          tributos.ICMS,
          tributos.IPI,
          tributos.ISS,
        ],
      },
      dasPie: {
        labels: ["IRPJ", "CSLL", "COFINS", "PIS/Pasep", "INSS/CPP", "ICMS", "IPI", "ISS"],
        values: [
          tributos.IRPJ,
          tributos.CSLL,
          tributos.COFINS,
          tributos.PIS_Pasep,
          tributos.INSS_CPP,
          tributos.ICMS,
          tributos.IPI,
          tributos.ISS,
        ],
      },
      receitaLine: { labels: pares.map((p) => p.mes), values: pares.map((p) => p.valor) },
      receitaLineExterno: paresME.length > 0 ? {
        labels: paresME.map((p) => p.mes),
        values: paresME.map((p) => +p.valor.toFixed(4)),
        valuesFormatados: paresME.map((p) => p.valorFormatado4d),
      } : undefined,
    },
    debug: {
      rawPreview: text.slice(0, 600),
      secao21: { rpaRow: rowRPA, rbt12Row: rowRBT12, rbaRow: rowRBA, rbaaRow: rowRBAA, limiteRow: rowLimite },
      series: {
        blocoMI: sliceBetween(text, /2\.2\.1\)\s*Mercado Interno/i, /2\.2\.2\)\s*Mercado Externo/i),
        blocoME: sliceBetween(text, /2\.2\.2\)\s*Mercado Externo/i, /\n\s*2\.[0-9]+\)/),
        miCount: pares.length,
        meCount: paresME.length,
      },
      // Alimenta a UI com as atividades extraídas do texto quando disponível
      atividades: atividadesFromTexto.map((a) => ({
        nome: a.nome,
        receita_bruta_informada: a.receita_bruta_informada,
        tributos: a.tributos,
      })),
    },
    metadata: { processadoEm: new Date().toISOString(), versao: "1.2", fonte: "PGDAS-D PDF" },
  }
}