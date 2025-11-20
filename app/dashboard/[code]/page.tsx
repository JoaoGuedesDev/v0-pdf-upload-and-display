"use server"
import { redirect } from 'next/navigation'

type Props = { params: { code: string } }

export default async function DashboardPage({ params }: Props) {
  const code = (params.code || '').replace(/[^a-z0-9-]/gi, '')

  if (!code) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Link inválido</h1>
        <p>Esperado formato: /dashboard/1234</p>
        <form action="/" method="get">
          <button type="submit" style={{ color: '#2563eb', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            Voltar
          </button>
        </form>
      </div>
    )
  }
  // Rota antiga: redireciona para canônica /d/[id]
  redirect(`/d/${code}`)
}