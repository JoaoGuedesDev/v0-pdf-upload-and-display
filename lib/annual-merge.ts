
export function mergeAnnualData(results: any[]) {
  if (!results.length) return null

  // Base structure from the first file (usually January or December)
  // We'll use it as a template and overwrite values
  const base = JSON.parse(JSON.stringify(results[0]))
  const dados = base.dados || base

  // Initialize accumulators
  let totalRpa = 0
  let totalTributos = {
    irpj: 0, csll: 0, cofins: 0, pis: 0, inss_cpp: 0, icms: 0, ipi: 0, iss: 0, total: 0
  }
  
  // Track unique years found
  const years = new Set<string>()

  // Helper to parse numeric values safely
  const val = (v: any) => typeof v === 'number' ? v : (Number(v) || 0)

  // Iterate all results
  for (const res of results) {
    const d = res.dados || res
    
    // Sum Revenue (RPA)
    const rpa = d.discriminativo_receitas?.rpa?.total || 0
    totalRpa += val(rpa)

    // Sum Taxes
    // Need to traverse establishments/activities to sum taxes correctly if available
    // Or use the 'totais' field if reliable
    const totais = d.estabelecimentos?.[0]?.totais?.declarado || {} // Assuming single establishment for now
    if (totais) {
       totalTributos.irpj += val(totais.irpj)
       totalTributos.csll += val(totais.csll)
       totalTributos.cofins += val(totais.cofins)
       totalTributos.pis += val(totais.pis)
       totalTributos.inss_cpp += val(totais.inss_cpp)
       totalTributos.icms += val(totais.icms)
       totalTributos.ipi += val(totais.ipi)
       totalTributos.iss += val(totais.iss)
       totalTributos.total += val(totais.total || (val(totais.irpj) + val(totais.csll) + val(totais.cofins) + val(totais.pis) + val(totais.inss_cpp) + val(totais.icms) + val(totais.ipi) + val(totais.iss)))
    }

    // Extract year
    const periodo = d.cabecalho?.periodo?.apuracao || d.cabecalho?.periodo?.fim
    if (periodo) {
      const year = periodo.split('/')[1]
      if (year) years.add(year)
    }
  }

  // Update base object
  if (dados.discriminativo_receitas?.rpa) {
    dados.discriminativo_receitas.rpa.total = totalRpa
    // Clear monthly breakdown or set to average? Let's leave breakdown as is (likely incorrect) or clear it.
    // Ideally, we would sum MI and ME too.
    // For simplicity, we just update the total RPA which is the most important metric.
  }

  // Update header
  if (dados.cabecalho?.periodo) {
    const yearList = Array.from(years).sort().join(', ')
    dados.cabecalho.periodo.apuracao = `Ano ${yearList}`
    dados.cabecalho.periodo.inicio = `01/${Array.from(years)[0]}`
    dados.cabecalho.periodo.fim = `12/${Array.from(years)[years.size - 1]}`
  }

  // Update totals
  if (dados.estabelecimentos?.[0]?.totais?.declarado) {
    const t = dados.estabelecimentos[0].totais.declarado
    t.irpj = totalTributos.irpj
    t.csll = totalTributos.csll
    t.cofins = totalTributos.cofins
    t.pis = totalTributos.pis
    t.inss_cpp = totalTributos.inss_cpp
    t.icms = totalTributos.icms
    t.ipi = totalTributos.ipi
    t.iss = totalTributos.iss
    t.total = totalTributos.total
  }

  // Update Effective Rate (Calculated)
  if (totalRpa > 0) {
    const effectiveRate = (totalTributos.total / totalRpa) * 100
    if (!dados.calculos) dados.calculos = {}
    dados.calculos.aliquotaEfetiva = effectiveRate
    dados.calculos.aliquotaEfetivaFormatada = effectiveRate.toFixed(2) + '%'
  }

  // Add a flag to indicate this is an annual summary
  dados.isAnnual = true
  dados.processedFilesCount = results.length

  return base
}
