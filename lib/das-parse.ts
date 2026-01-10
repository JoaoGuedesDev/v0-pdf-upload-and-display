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
      const toNumber = (v: any) => typeof v === 'number' ? v : Number(v) || 0
      const estabs = obj.estabelecimentos || []
      const estab0 = estabs[0] || {}
      const tot = (estab0.totais && estab0.totais.declarado) || null
      const sumEstabsExigivel = (() => {
        const acc = { irpj: 0, csll: 0, cofins: 0, pis: 0, inss_cpp: 0, icms: 0, ipi: 0, iss: 0 }
        for (const e of estabs) {
          const te = (e?.totais || {}) as any
          const ex = te.exigivel || te.exigível
          const src = ex || te.declarado || null
          if (src) {
            acc.irpj += toNumber(src.irpj)
            acc.csll += toNumber(src.csll)
            acc.cofins += toNumber(src.cofins)
            acc.pis += toNumber(src.pis)
            acc.inss_cpp += toNumber(src.inss_cpp)
            acc.icms += toNumber(src.icms)
            acc.ipi += toNumber(src.ipi)
            acc.iss += toNumber(src.iss)
          }
        }
        const total = acc.irpj + acc.csll + acc.cofins + acc.pis + acc.inss_cpp + acc.icms + acc.ipi + acc.iss
        return { ...acc, total }
      })()
      const atividades = Array.isArray(estabs) ? estabs.flatMap((e: any) => (Array.isArray(e?.atividades) ? e.atividades : [])) : []

      

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

      const totalGeralEmpresa = (obj as any)?.total_geral_empresa || {}
      const exigivelEmpresa = (totalGeralEmpresa as any)?.exigivel || (totalGeralEmpresa as any)?.exigível
      const empresaDecl = exigivelEmpresa ? {
        IRPJ: toNumber(exigivelEmpresa.irpj),
        CSLL: toNumber(exigivelEmpresa.csll),
        COFINS: toNumber(exigivelEmpresa.cofins),
        PIS_Pasep: toNumber(exigivelEmpresa.pis),
        INSS_CPP: toNumber(exigivelEmpresa.inss_cpp),
        ICMS: toNumber(exigivelEmpresa.icms),
        IPI: toNumber(exigivelEmpresa.ipi),
        ISS: toNumber(exigivelEmpresa.iss),
        Total: toNumber(exigivelEmpresa.total),
      } : null
      const estabsDecl = (sumEstabsExigivel.total > 0) ? {
        IRPJ: toNumber(sumEstabsExigivel.irpj),
        CSLL: toNumber(sumEstabsExigivel.csll),
        COFINS: toNumber(sumEstabsExigivel.cofins),
        PIS_Pasep: toNumber(sumEstabsExigivel.pis),
        INSS_CPP: toNumber(sumEstabsExigivel.inss_cpp),
        ICMS: toNumber(sumEstabsExigivel.icms),
        IPI: toNumber(sumEstabsExigivel.ipi),
        ISS: toNumber(sumEstabsExigivel.iss),
        Total: toNumber(sumEstabsExigivel.total),
      } : null
      const tribDecl = empresaDecl && empresaDecl.Total > 0 ? empresaDecl
        : (estabsDecl && estabsDecl.Total > 0 ? estabsDecl
        : (!totIsZero ? {
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
          }))

      // Split de tributos por Mercadorias/Serviços e Interno/Externo (JSON)
      const toKey = (s: string) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      const isExt = (nome: string) => {
        const k = toKey(nome)
        if (/(exceto|nao)\s+para\s+o?\s*exterior/.test(k) || /(exceto|nao).*(exterior|externo)/.test(k)) return false
        return /(para\s+o\s+exterior|mercado\s+externo|para\s+exterior|exportacao)/.test(k)
      }
      const isServ = (nome: string) => /(servico|servicos|prestacao)/.test(toKey(nome))
      const baseMap = () => ({ IRPJ: 0, CSLL: 0, COFINS: 0, PIS_PASEP: 0, INSS_CPP: 0, ICMS: 0, IPI: 0, ISS: 0 })
      const addTrib = (map: any, t: any) => {
        map.IRPJ += toNumber(t?.irpj)
        map.CSLL += toNumber(t?.csll)
        map.COFINS += toNumber(t?.cofins)
        map.PIS_PASEP += toNumber(t?.pis)
        map.INSS_CPP += toNumber(t?.inss_cpp)
        map.ICMS += toNumber(t?.icms)
        map.IPI += toNumber(t?.ipi)
        map.ISS += toNumber(t?.iss)
      }
      const mInt = baseMap()
      const mExt = baseMap()
      const sInt = baseMap()
      const sExt = baseMap()
      for (const at of atividades) {
        const nomeAt = String(at?.nome || at?.name || at?.descricao || '')
        const ext = isExt(nomeAt)
        const serv = isServ(nomeAt)
        const trib = at?.tributos || {}
        if (serv && ext) addTrib(sExt, trib)
        else if (serv && !ext) addTrib(sInt, trib)
        else if (!serv && ext) addTrib(mExt, trib)
        else addTrib(mInt, trib)
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
          tributosMercadoriasInterno: mInt,
          tributosMercadoriasExterno: mExt,
          tributosServicosInterno: sInt,
          tributosServicosExterno: sExt,
          cenario,
          valorTotalDAS: valorDAS,
          valorTotalDASFormatado: moneyBR(valorDAS),
          calculos: {
            aliquotaEfetiva: +aliquotaEfetiva.toFixed(1),
            aliquotaEfetivaFormatada: formatPercent1(aliquotaEfetiva),
            margemLiquida: +margemLiquida.toFixed(3),
            analise_aliquota: (() => {
              const sumVals = (o: any) => Object.values(o || {}).reduce((a: number, b: any) => a + Number(b || 0), 0)
              const tribServ = sumVals(sInt) + sumVals(sExt)
              const tribMerc = sumVals(mInt) + sumVals(mExt)
              const tabelaFaixas: Record<number, { faixa: number; min: number; max: number; aliquota_nominal: number; valor_deduzir: number }[]> = {
                1: [
                  { faixa: 1, min: 0, max: 180000, aliquota_nominal: 0.04, valor_deduzir: 0 },
                  { faixa: 2, min: 180000.01, max: 360000, aliquota_nominal: 0.073, valor_deduzir: 5940 },
                  { faixa: 3, min: 360000.01, max: 720000, aliquota_nominal: 0.095, valor_deduzir: 13860 },
                  { faixa: 4, min: 720000.01, max: 1800000, aliquota_nominal: 0.107, valor_deduzir: 22500 },
                  { faixa: 5, min: 1800000.01, max: 3600000, aliquota_nominal: 0.143, valor_deduzir: 87300 },
                  { faixa: 6, min: 3600000.01, max: 4800000, aliquota_nominal: 0.19, valor_deduzir: 378000 },
                ],
                2: [
                  { faixa: 1, min: 0, max: 180000, aliquota_nominal: 0.045, valor_deduzir: 0 },
                  { faixa: 2, min: 180000.01, max: 360000, aliquota_nominal: 0.078, valor_deduzir: 5940 },
                  { faixa: 3, min: 360000.01, max: 720000, aliquota_nominal: 0.10, valor_deduzir: 13860 },
                  { faixa: 4, min: 720000.01, max: 1800000, aliquota_nominal: 0.112, valor_deduzir: 22500 },
                  { faixa: 5, min: 1800000.01, max: 3600000, aliquota_nominal: 0.147, valor_deduzir: 85500 },
                  { faixa: 6, min: 3600000.01, max: 4800000, aliquota_nominal: 0.30, valor_deduzir: 720000 },
                ],
                3: [
                  { faixa: 1, min: 0, max: 180000, aliquota_nominal: 0.06, valor_deduzir: 0 },
                  { faixa: 2, min: 180000.01, max: 360000, aliquota_nominal: 0.112, valor_deduzir: 9360 },
                  { faixa: 3, min: 360000.01, max: 720000, aliquota_nominal: 0.135, valor_deduzir: 17640 },
                  { faixa: 4, min: 720000.01, max: 1800000, aliquota_nominal: 0.16, valor_deduzir: 35640 },
                  { faixa: 5, min: 1800000.01, max: 3600000, aliquota_nominal: 0.21, valor_deduzir: 125640 },
                  { faixa: 6, min: 3600000.01, max: 4800000, aliquota_nominal: 0.33, valor_deduzir: 648000 },
                ],
                4: [
                  { faixa: 1, min: 0, max: 180000, aliquota_nominal: 0.045, valor_deduzir: 0 },
                  { faixa: 2, min: 180000.01, max: 360000, aliquota_nominal: 0.09, valor_deduzir: 8100 },
                  { faixa: 3, min: 360000.01, max: 720000, aliquota_nominal: 0.102, valor_deduzir: 12420 },
                  { faixa: 4, min: 720000.01, max: 1800000, aliquota_nominal: 0.14, valor_deduzir: 39780 },
                  { faixa: 5, min: 1800000.01, max: 3600000, aliquota_nominal: 0.22, valor_deduzir: 183780 },
                  { faixa: 6, min: 3600000.01, max: 4800000, aliquota_nominal: 0.33, valor_deduzir: 828000 },
                ],
                5: [
                  { faixa: 1, min: 0, max: 180000, aliquota_nominal: 0.155, valor_deduzir: 0 },
                  { faixa: 2, min: 180000.01, max: 360000, aliquota_nominal: 0.18, valor_deduzir: 4500 },
                  { faixa: 3, min: 360000.01, max: 720000, aliquota_nominal: 0.195, valor_deduzir: 9900 },
                  { faixa: 4, min: 720000.01, max: 1800000, aliquota_nominal: 0.205, valor_deduzir: 17100 },
                  { faixa: 5, min: 1800000.01, max: 3600000, aliquota_nominal: 0.23, valor_deduzir: 62100 },
                  { faixa: 6, min: 3600000.01, max: 4800000, aliquota_nominal: 0.305, valor_deduzir: 540000 },
                ],
              }
              const tabelaReparticao: Record<number, Record<number, { icms?: number; iss?: number }>> = {
                1: {
                  1: { icms: 0.34 }, 2: { icms: 0.34 }, 3: { icms: 0.335 }, 4: { icms: 0.335 }, 5: { icms: 0.335 }, 6: { icms: 0.335 }
                },
                2: { 
                  1: { icms: 0.32 }, 2: { icms: 0.32 }, 3: { icms: 0.32 }, 4: { icms: 0.32 }, 5: { icms: 0.32 }, 6: { icms: 0.32 }
                },
                3: {
                  1: { iss: 0.335 }, 2: { iss: 0.32 }, 3: { iss: 0.325 }, 4: { iss: 0.325 }, 5: { iss: 0.335 }, 6: { iss: 0.335 }
                },
                4: {
                  1: { iss: 0.445 }, 2: { iss: 0.40 }, 3: { iss: 0.40 }, 4: { iss: 0.40 }, 5: { iss: 0.40 }, 6: { iss: 0.40 } 
                },
                5: {
                   1: { iss: 0.335 }, 2: { iss: 0.32 }, 3: { iss: 0.325 }, 4: { iss: 0.325 }, 5: { iss: 0.335 }, 6: { iss: 0.335 }
                }
              }
              const pickFaixa = (anexo: number, rbt12Val: number) => {
                const table = tabelaFaixas[anexo] || []
                const f = table.find((fx) => rbt12Val >= fx.min && rbt12Val <= fx.max)
                if (!f) return undefined as any
                const aliqEfetiva = rbt12Val > 0 ? ((f.aliquota_nominal * rbt12Val) - f.valor_deduzir) / rbt12Val : 0
                return { ...f, aliquota_efetiva: aliqEfetiva }
              }
              const rpaServ = (() => {
                let total = 0
                for (const a of atividades) {
                  const nome = String((a as any)?.nome || (a as any)?.name || (a as any)?.descricao || '')
                  if (isServ(nome)) total += toNumber((a as any)?.receita_bruta_informada)
                }
                if (total > 0) return total
                const denom = tribServ + tribMerc
                if (denom > 0) return (rpaTotal || 0) * (tribServ / denom)
                return 0
              })()
              const rpaMerc = (() => {
                let total = 0
                for (const a of atividades) {
                  const nome = String((a as any)?.nome || (a as any)?.name || (a as any)?.descricao || '')
                  if (!isServ(nome)) total += toNumber((a as any)?.receita_bruta_informada)
                }
                if (total > 0) return total
                const denom = tribServ + tribMerc
                if (denom > 0) return (rpaTotal || 0) * (tribMerc / denom)
                return 0
              })()
              const aliqServ = rpaServ > 0 ? (tribServ / rpaServ) * 100 : 0
              const aliqMerc = rpaMerc > 0 ? (tribMerc / rpaMerc) * 100 : 0
              const combinedSeries = (() => {
                const map: Record<string, number> = {}
                for (const p of historicoMI || []) { map[p.mes] = (map[p.mes] || 0) + toNumber(p.valor) }
                for (const p of historicoME || []) { map[p.mes] = (map[p.mes] || 0) + toNumber(p.valor) }
                const arr = Object.entries(map).map(([mes, valor]) => ({ mes, valor }))
                return sortByDate(arr)
              })()
              const rbt12_original_calc = (rbt12Total || 0) > 0 ? rbt12Total : (rbt12MiSerie + rbt12MeSerie)
              const rbt12_atual_calc = (() => {
                const arr = combinedSeries
                if (arr.length >= 12) {
                  const last12 = arr.slice(arr.length - 12)
                  const soma12 = last12.reduce((acc, p) => acc + (toNumber(p.valor) || 0), 0)
                  const oldest = toNumber(last12[0]?.valor) || 0
                  return soma12 - oldest + (rpaTotal || 0)
                }
                return rbt12_original_calc
              })()
              const meta = {
                anexo_principal: cenario === 'servicos' ? 3 : 1,
                rpa_atual: rpaTotal,
                rbt12_original: rbt12_original_calc,
                rbt12_atual: rbt12_atual_calc,
              }

              // Inferir Anexo para atividades (JSON)
              const detalhe = []
              const grupos: Record<number, any[]> = {}
              const acts = Array.isArray(atividades) ? atividades : []
              
              if (acts.length === 0) {
                  const anexo = cenario === 'mercadorias' ? 1 : 3
                  grupos[anexo] = [{ nome: 'Atividade Geral', tributos: tribDecl, receita_bruta_informada: rpaTotal }]
              } else {
                  for(const at of acts) {
                      const n = String(at.nome || at.name || at.descricao || '').toLowerCase()
                      const t = at.tributos || {}
                      let anexo = 3
                      const icms = toNumber(t.icms)
                      const iss = toNumber(t.iss)
                      
                      if (icms > 0) anexo = 1
                      else if (iss > 0) anexo = 3
                      else if (n.includes('comercio') || n.includes('revenda')) anexo = 1
                      else if (n.includes('industrial')) anexo = 2
                      else if (n.includes('servico') || n.includes('presta')) anexo = 3
                      
                      if (!grupos[anexo]) grupos[anexo] = []
                      grupos[anexo].push(at)
                  }
              }

              for (const [anexoStr, groupActs] of Object.entries(grupos)) {
                  const anexo = Number(anexoStr)
                  const fxOrig = pickFaixa(anexo, rbt12_original_calc)
                  const fxAtual = pickFaixa(anexo, rbt12_atual_calc)
                  
                  const parcelas_ajuste = groupActs.map(at => {
                      const valor = toNumber(at.receita_bruta_informada) || 0
                      const nome = at.nome || at.name || at.descricao || ''
                      const t = at.tributos || {}
                      const totalTrib = toNumber(t.irpj) + toNumber(t.csll) + toNumber(t.cofins) + toNumber(t.pis) + toNumber(t.inss_cpp) + toNumber(t.icms) + toNumber(t.ipi) + toNumber(t.iss)
                      const aliqReal = valor > 0 ? (totalTrib / valor) * 100 : 0
                      
                      const aliqTeoricaOrig = (fxOrig?.aliquota_efetiva || 0) * 100
                      const aliqTeoricaAtual = (fxAtual?.aliquota_efetiva || 0) * 100
                  
                      // Helper to respect n8n values (including 0) over local calculation
                      const getVal = (v: any) => (v !== undefined && v !== null && String(v).trim() !== '') ? Number(v) : undefined
                      
                      const n8n_orig_adj = getVal(at.aliquota_efetiva_original_ajustada_percent)
                      const n8n_atual_adj = getVal(at.aliquota_efetiva_atual_ajustada_percent)
                      const n8n_orig_pct = getVal(at.aliquota_efetiva_original_percent)
                      const n8n_atual_pct = getVal(at.aliquota_efetiva_atual_percent)
                      const n8n_efetiva_atual = getVal(at.aliquota_efetiva_atual)
                      
                      const n8n_orig_sem_iss = getVal(at.aliquota_efetiva_original_sem_iss_percent)
                      const n8n_atual_sem_iss = getVal(at.aliquota_efetiva_atual_sem_iss_percent)
                      const n8n_orig_icms = getVal(at.aliquota_efetiva_original_icms_anexo1_percent)
                      const n8n_atual_icms = getVal(at.aliquota_efetiva_atual_icms_anexo1_percent)
                  
                      // Detecção de ST/Retenção pelo nome
                      const nNorm = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
                      
                      // Ignora se tiver "sem substituição" ou "sem retenção" explícito
                      const isSemST = /sem\s+(substituicao|substituição)/i.test(nNorm)
                      const isSemRet = /sem\s+(retencao|retenção)/i.test(nNorm)
                      
                      const isST_ICMS = !isSemST && (/(substituicao|substituição).*(tributaria|tributária)/i.test(nNorm) || /(icms).*(st)/i.test(nNorm) || /(st).*(icms)/i.test(nNorm))
                      const isRet_ISS = !isSemRet && (/(retencao|retenção).*(iss)/i.test(nNorm) || /(substituicao|substituição).*(tributaria|tributária).*(iss)/i.test(nNorm))

                      let factor = aliqTeoricaOrig > 0.0001 ? aliqReal / aliqTeoricaOrig : (aliqReal > 0 ? 1 : 0)

                      // Se o fator calculado for muito próximo de 1 (ou zero por falta de dados) mas houver indicativo de ST/Retenção,
                      // forçamos o uso da tabela de repartição para estimar o fator correto.
                      // Isso corrige casos onde o JSON traz os tributos cheios incorretamente ou zerados.
                      const faixaNum = fxOrig?.faixa || 0
                      const reparticao = tabelaReparticao[anexo]?.[faixaNum]
                      
                      if (reparticao) {
                        let deduction = 0
                        if (isST_ICMS && reparticao.icms) deduction += reparticao.icms
                        if (isRet_ISS && reparticao.iss) deduction += reparticao.iss
                        
                        if (deduction > 0) {
                          const estimatedFactor = 1 - deduction
                          // Se o fator real for > 0.95 (quase cheio) ou 0 (sem dados) ou muito baixo (erro de parser), usamos o estimado
                          // Adicionada tolerância para cima (ex: 1.05) caso haja arredondamentos
                          if (factor > 0.90 || factor === 0) {
                            factor = estimatedFactor
                          }
                        }
                      }

                      const aliqRealAtual = aliqTeoricaAtual * factor

                      return {
                          tipo_regra: 'geral',
                          nome: nome,
                          atividade_nome: nome,
                          descricao: nome,
                          valor: valor,
                          aliquota_efetiva_original_percent: n8n_orig_pct ?? aliqTeoricaOrig,
                          aliquota_efetiva_original_ajustada_percent: n8n_orig_adj ?? (n8n_orig_pct ?? (n8n_efetiva_atual ?? aliqReal)),
                          aliquota_efetiva_atual_percent: n8n_atual_pct ?? aliqTeoricaAtual,
                          aliquota_efetiva_atual_ajustada_percent: n8n_atual_adj ?? (n8n_atual_pct ?? (n8n_efetiva_atual ?? aliqRealAtual)),
                          aliquota_efetiva_original_sem_iss_percent: n8n_orig_sem_iss ?? aliqTeoricaOrig, 
                          aliquota_efetiva_atual_sem_iss_percent: n8n_atual_sem_iss ?? aliqTeoricaAtual,
                          aliquota_efetiva_original_icms_anexo1_percent: n8n_orig_icms ?? 0,
                          aliquota_efetiva_atual_icms_anexo1_percent: n8n_atual_icms ?? 0,
                          aliquota_efetiva_atual: n8n_efetiva_atual
                      }
                  })

                  detalhe.push({
                      anexo,
                      faixa_original: { faixa: fxOrig?.faixa },
                      faixa_atual: { faixa: fxAtual?.faixa },
                      rbt12_original: rbt12_original_calc,
                      rbt12_atual: rbt12_atual_calc,
                      parcelas_ajuste
                  })
              }

              const simulacao_todos_anexos = [1, 2, 3, 4, 5].map(anexo => {
                 const res = pickFaixa(anexo, rbt12_atual_calc)
                 if (!res) return null
                 return {
                   anexo,
                   faixa: res.faixa,
                   aliquota_nominal: res.aliquota_nominal,
                   deducao: res.valor_deduzir,
                   aliquota_efetiva: res.aliquota_efetiva,
                   aliquota_efetiva_percent: res.aliquota_efetiva * 100
                 }
              }).filter(Boolean)

              return { meta, simulacao_todos_anexos, detalhe }
            })(),
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
  // Aceita ausência de espaço entre MM/YYYY e valor, e ignora "R$" ou texto entre data e valor
  const pares = [...(blocoMI || '').matchAll(/(\d{2}\/\d{4})[^\d\n]*?((?:\d{1,3}(?:\.\d{3})+|\d+),(?:\d{2}))/g)]
    .map((m) => ({ mes: m[1], valor: brToFloat(m[2]), valorStr: m[2] }))

  const blocoME = sliceBetween(text, /2\.2\.2\)?\s*Mercado Externo/i, /\n\s*2\.[0-9]+\)/)
  const paresME = [...blocoME.matchAll(/(\d{2}\/\d{4})[^\d\n]*?((?:\d{1,3}(?:\.\d{3})+|\d+),(?:\d{2,4}))/gm)]
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
  const isExt = (nome: string) => {
    const k = toKey(nome)
    if (/(exceto|nao)\s+para\s+o?\s*exterior/.test(k) || /(exceto|nao).*(exterior|externo)/.test(k)) return false
    return /(para\s+o\s+exterior|mercado\s+externo|para\s+exterior|exportacao)/.test(k)
  }
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
        analise_aliquota: (() => {
          const tabelaFaixas: Record<number, { faixa: number; min: number; max: number; aliquota_nominal: number; valor_deduzir: number }[]> = {
            1: [
              { faixa: 1, min: 0, max: 180000, aliquota_nominal: 0.04, valor_deduzir: 0 },
              { faixa: 2, min: 180000.01, max: 360000, aliquota_nominal: 0.073, valor_deduzir: 5940 },
              { faixa: 3, min: 360000.01, max: 720000, aliquota_nominal: 0.095, valor_deduzir: 13860 },
              { faixa: 4, min: 720000.01, max: 1800000, aliquota_nominal: 0.107, valor_deduzir: 22500 },
              { faixa: 5, min: 1800000.01, max: 3600000, aliquota_nominal: 0.143, valor_deduzir: 87300 },
              { faixa: 6, min: 3600000.01, max: 4800000, aliquota_nominal: 0.19, valor_deduzir: 378000 },
            ],
            2: [
              { faixa: 1, min: 0, max: 180000, aliquota_nominal: 0.045, valor_deduzir: 0 },
              { faixa: 2, min: 180000.01, max: 360000, aliquota_nominal: 0.078, valor_deduzir: 5940 },
              { faixa: 3, min: 360000.01, max: 720000, aliquota_nominal: 0.10, valor_deduzir: 13860 },
              { faixa: 4, min: 720000.01, max: 1800000, aliquota_nominal: 0.112, valor_deduzir: 22500 },
              { faixa: 5, min: 1800000.01, max: 3600000, aliquota_nominal: 0.147, valor_deduzir: 85500 },
              { faixa: 6, min: 3600000.01, max: 4800000, aliquota_nominal: 0.30, valor_deduzir: 720000 },
            ],
            3: [
              { faixa: 1, min: 0, max: 180000, aliquota_nominal: 0.06, valor_deduzir: 0 },
              { faixa: 2, min: 180000.01, max: 360000, aliquota_nominal: 0.112, valor_deduzir: 9360 },
              { faixa: 3, min: 360000.01, max: 720000, aliquota_nominal: 0.135, valor_deduzir: 17640 },
              { faixa: 4, min: 720000.01, max: 1800000, aliquota_nominal: 0.16, valor_deduzir: 35640 },
              { faixa: 5, min: 1800000.01, max: 3600000, aliquota_nominal: 0.21, valor_deduzir: 125640 },
              { faixa: 6, min: 3600000.01, max: 4800000, aliquota_nominal: 0.33, valor_deduzir: 648000 },
            ],
            4: [
              { faixa: 1, min: 0, max: 180000, aliquota_nominal: 0.045, valor_deduzir: 0 },
              { faixa: 2, min: 180000.01, max: 360000, aliquota_nominal: 0.09, valor_deduzir: 8100 },
              { faixa: 3, min: 360000.01, max: 720000, aliquota_nominal: 0.102, valor_deduzir: 12420 },
              { faixa: 4, min: 720000.01, max: 1800000, aliquota_nominal: 0.14, valor_deduzir: 39780 },
              { faixa: 5, min: 1800000.01, max: 3600000, aliquota_nominal: 0.22, valor_deduzir: 183780 },
              { faixa: 6, min: 3600000.01, max: 4800000, aliquota_nominal: 0.33, valor_deduzir: 828000 },
            ],
            5: [
              { faixa: 1, min: 0, max: 180000, aliquota_nominal: 0.155, valor_deduzir: 0 },
              { faixa: 2, min: 180000.01, max: 360000, aliquota_nominal: 0.18, valor_deduzir: 4500 },
              { faixa: 3, min: 360000.01, max: 720000, aliquota_nominal: 0.195, valor_deduzir: 9900 },
              { faixa: 4, min: 720000.01, max: 1800000, aliquota_nominal: 0.205, valor_deduzir: 17100 },
              { faixa: 5, min: 1800000.01, max: 3600000, aliquota_nominal: 0.23, valor_deduzir: 62100 },
              { faixa: 6, min: 3600000.01, max: 4800000, aliquota_nominal: 0.305, valor_deduzir: 540000 },
            ],
          }
          const pickFaixa = (anexo: number, rbt12Val: number) => {
            const table = tabelaFaixas[anexo] || []
            // Busca a primeira faixa onde o valor cabe no teto (max)
            // Isso resolve problemas de "buracos" decimais (ex: 180000.005)
            let f = table.find((fx) => rbt12Val <= fx.max)
            
            // Se não encontrou e a tabela existe, pode ser que excedeu o teto máximo
            if (!f && table.length > 0) {
               if (rbt12Val > table[table.length - 1].max) f = table[table.length - 1]
               // Se for negativo (improvável), cairia no find acima (pois é <= max da primeira faixa),
               // mas por segurança podemos forçar a primeira faixa se não achou nada e é menor que o min
               else if (rbt12Val < table[0].min) f = table[0]
            }
            
            if (!f) return undefined as any
            const aliqEfetiva = rbt12Val > 0 ? ((f.aliquota_nominal * rbt12Val) - f.valor_deduzir) / rbt12Val : f.aliquota_nominal
            return { ...f, aliquota_efetiva: aliqEfetiva }
          }

          const parseMes = (s: string) => {
            const [mm, yy] = String(s || '').split('/')
            return { month: Number(mm), year: Number(yy) }
          }
          const sortByDate = (arr: any[]) => [...arr].sort((a, b) => {
            const pa = parseMes(a.mes), pb = parseMes(b.mes)
            return pa.year === pb.year ? pa.month - pb.month : pa.year - pb.year
          })

          const combinedSeries = (() => {
             const map: Record<string, number> = {}
             for (const p of pares || []) { map[p.mes] = (map[p.mes] || 0) + Number(p.valor) }
             for (const p of paresME || []) { map[p.mes] = (map[p.mes] || 0) + Number(p.valor) }
             const arr = Object.entries(map).map(([mes, valor]) => ({ mes, valor }))
             return sortByDate(arr)
          })()

          const rbt12_original_calc = (() => {
             const v = brToFloat(rbt12) || (rowRBT12?.total || 0)
             return Number.isFinite(v) ? v : 0
          })()
          
          const rbt12_atual_calc = (() => {
             const arr = combinedSeries
             if (arr.length >= 12) {
                const last12 = arr.slice(arr.length - 12)
                const soma12 = last12.reduce((acc, p) => acc + Number(p.valor || 0), 0)
                const oldest = Number(last12[0]?.valor) || 0
                const rpa = Number(receitaPA)
                const res = soma12 - oldest + (Number.isFinite(rpa) ? rpa : 0)
                return Number.isFinite(res) ? res : rbt12_original_calc
             }
             return rbt12_original_calc
          })()

          // Inferir Anexo para atividades
          const detalhe = []
          const grupos: Record<number, typeof atividadesFromTexto> = {}
          const atividades = atividadesFromTexto || []
          
          if (atividades.length === 0) {
              const anexo = cenarioTexto === 'mercadorias' ? 1 : 3
              grupos[anexo] = [{ nome: 'Atividade Geral', tributos: tributos, receita_bruta_informada: receitaPA }]
          } else {
              for(const at of atividades) {
                  const n = String(at.nome || '').toLowerCase()
                  const t = at.tributos || {}
                  let anexo = 3
                  if ((t.icms || 0) > 0) anexo = 1
                  else if (n.includes('comercio') || n.includes('revenda')) anexo = 1
                  else if (n.includes('industrial')) anexo = 2
                  else if (n.includes('servico')) anexo = 3
                  
                  if (!grupos[anexo]) grupos[anexo] = []
                  grupos[anexo].push(at)
              }
          }

          for (const [anexoStr, acts] of Object.entries(grupos)) {
              const anexo = Number(anexoStr)
              const fxOrig = pickFaixa(anexo, rbt12_original_calc)
              const fxAtual = pickFaixa(anexo, rbt12_atual_calc)
              
              const parcelas_ajuste = acts.map(at => {
                  const valor = at.receita_bruta_informada || 0
                  return {
                      tipo_regra: 'geral',
                      nome: at.nome,
                      atividade_nome: at.nome,
                      descricao: at.nome,
                      valor: valor,
                      aliquota_efetiva_original_percent: (fxOrig?.aliquota_efetiva || 0) * 100,
                      aliquota_efetiva_atual_percent: (fxAtual?.aliquota_efetiva || 0) * 100,
                      aliquota_efetiva_original_sem_iss_percent: (fxOrig?.aliquota_efetiva || 0) * 100, 
                      aliquota_efetiva_atual_sem_iss_percent: (fxAtual?.aliquota_efetiva || 0) * 100
                  }
              })

              detalhe.push({
                  anexo,
                  faixa_original: { faixa: fxOrig?.faixa },
                  faixa_atual: { faixa: fxAtual?.faixa },
                  rbt12_original: rbt12_original_calc,
                  rbt12_atual: rbt12_atual_calc,
                  parcelas_ajuste
              })
          }

          const simulacao_todos_anexos = [1, 2, 3, 4, 5].map(anexo => {
             const res = pickFaixa(anexo, rbt12_atual_calc)
             if (!res) return null
             return {
               anexo,
               faixa: res.faixa,
               aliquota_nominal: res.aliquota_nominal,
               deducao: res.valor_deduzir,
               aliquota_efetiva: res.aliquota_efetiva,
               aliquota_efetiva_percent: res.aliquota_efetiva * 100
             }
          }).filter(Boolean)

          return {
             detalhe,
             simulacao_todos_anexos,
             meta: {
                 rpa_atual: receitaPA,
                 rbt12_original: rbt12_original_calc,
                 rbt12_atual: rbt12_atual_calc
             }
          }
        })()
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
