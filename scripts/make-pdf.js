const fs = require('node:fs')
const path = require('node:path')
const { generateDasReportPDF } = require('../lib/pdf-generators/das-report-generator.ts')

async function run() {
  const sample = {
    identificacao: { cnpj: '00.000.000/0000-00', razaoSocial: 'Empresa Exemplo', periodoApuracao: '01/2025', municipio: 'São Paulo', uf: 'SP' },
    receitas: { receitaPA: 150000, rbt12: 1200000, rba: 300000, rbaa: 280000 },
    tributos: { IRPJ: 137.38, CSLL: 120.20, COFINS: 468.45, PIS_Pasep: 101.66, INSS_CPP: 1490.52, ICMS: 0, IPI: 0, ISS: 1116.17, Total: 3434.38 },
    charts: [],
  }
  const bytes = await generateDasReportPDF(sample, { title: 'Relatório Pivot', author: 'Integra', keywords: ['pivot','design'] })
  const out = path.resolve('public', 'shared', 'relatorio-pivot-exemplo.pdf')
  fs.writeFileSync(out, Buffer.from(bytes))
  console.log('PDF gerado em', out)
}

run().catch(err => { console.error(err); process.exit(1) })