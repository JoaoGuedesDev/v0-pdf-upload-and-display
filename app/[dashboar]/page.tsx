'use server'
import { redirect } from 'next/navigation'

import fs from 'node:fs'
import path from 'node:path'

type Props = { params: { dashboar: string } }

export default async function DashboardSharedPage({ params }: Props) {
  const seg = params.dashboar || ''
  // Aceita tanto "dashboar=1234" quanto apenas "1234"
  const possible = seg.includes('=') ? seg.split('=')[1] : seg
  const code = (possible || '').replace(/[^0-9]/g, '')
  
  if (!code) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Link inválido</h1>
        <p>Esperado formato: /dashboar=1234</p>
        {/* use Link for client navigation */}
        <form action="/" method="get">
          <button type="submit" style={{ color: '#2563eb', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            Voltar
          </button>
        </form>
      </div>
    )
  }
  // Redireciona para a rota canônica
  redirect(`/d/${code}`)
}