'use server'

import fs from 'node:fs'
import path from 'node:path'

type Props = { params: { id: string } }

export default async function SharePage({ params }: Props) {
  const id = params.id
  const direct = path.resolve('public', 'shared', `${id}.json`)
  const dashed = path.resolve('public', 'shared', `dash-${id}.json`)
  const filePath = fs.existsSync(direct) ? direct : dashed
  if (!fs.existsSync(filePath)) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Link inválido ou expirado</h1>
        <p>Não encontramos o resultado compartilhado para o ID: {id}</p>
      </div>
    )
  }
  const json = fs.readFileSync(filePath, 'utf-8')
  const data = JSON.parse(json)

  const dados = data?.dados || {}
  const graficos = data?.graficos || {}
  const idf = dados?.identificacao || {}
  const trib = dados?.tributos || {}
  const rec = dados?.receitas || {}

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>Dashboard do DAS</h1>
          <p style={{ margin: 0, color: '#64748b' }}>Compartilhado • ID {id}</p>
        </div>
        <a href="/" style={{ color: '#2563eb' }}>Voltar</a>
      </header>
      <hr style={{ margin: '16px 0' }} />

      <section>
        <h2>Identificação</h2>
        <p><strong>Razão Social:</strong> {idf?.razaoSocial || '—'}</p>
        <p><strong>CNPJ:</strong> {idf?.cnpj || '—'}</p>
        <p><strong>Município/UF:</strong> {(idf?.municipio || '—')}/{idf?.uf || '—'}</p>
        <p><strong>Período:</strong> {idf?.periodoApuracao || '—'}</p>
      </section>

      <section>
        <h2>Receitas</h2>
        <p><strong>Receita PA:</strong> R$ {Number(rec?.receitaPA || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        <p><strong>RBT12:</strong> R$ {Number(rec?.rbt12 || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        <p><strong>RBA:</strong> R$ {Number(rec?.rba || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        <p><strong>RBAA:</strong> R$ {Number(rec?.rbaa || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </section>

      <section>
        <h2>Tributos</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Tributo</th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Valor (R$)</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['IRPJ', trib?.IRPJ],
              ['CSLL', trib?.CSLL],
              ['COFINS', trib?.COFINS],
              ['PIS/Pasep', trib?.PIS_Pasep],
              ['INSS/CPP', trib?.INSS_CPP],
              ['ICMS', trib?.ICMS],
              ['IPI', trib?.IPI],
              ['ISS', trib?.ISS],
              ['Total', trib?.Total],
            ].map(([label, val], idx) => (
              <tr key={idx}>
                <td style={{ padding: '8px 0' }}>{label}</td>
                <td style={{ padding: '8px 0', textAlign: 'right' }}>{Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Gráficos (dados)</h2>
        <p><strong>Receita MI (últimos pontos):</strong> {(graficos?.receitaLine?.values || []).slice(-5).join(', ')}</p>
        {graficos?.receitaLineExterno && (
          <p><strong>Receita ME (últimos pontos):</strong> {(graficos?.receitaLineExterno?.values || []).slice(-5).join(', ')}</p>
        )}
      </section>

      <footer style={{ marginTop: 24, color: '#64748b' }}>
        <p>Gerado em: {data?.metadata?.processadoEm || '—'}</p>
        <p>Versão: {data?.metadata?.versao || '—'}</p>
      </footer>
    </div>
  )
}