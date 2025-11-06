// Página de servidor padrão; remover diretiva desnecessária evita comportamentos estranhos em Next 16

import { getDashboard } from '@/lib/store'
import PGDASDProcessorIA from '@/components/pgdasd-processor-ia'
export const dynamic = 'force-dynamic'

// Em Next 16, `params` é uma Promise em rotas dinâmicas
type Props = { params: Promise<{ id?: string }> }

export default async function SharedDashboardPage({ params }: Props) {
  // Desembrulha a Promise de params
  const p = await params
  console.log('[route:/d/[id]] params =', p)
  const raw = (p?.id ?? '').toString()
  const id = raw.replace(/[^a-z0-9-]/gi, '')

  if (!id) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Link inválido</h1>
        <p>Esperado formato: /d/abcdef123</p>
        <a href="/" style={{ color: '#2563eb' }}>Voltar</a>
      </div>
    )
  }

  const data = await getDashboard(id)
  if (!data) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Link inválido ou expirado</h1>
        <p>Não encontramos o dashboard compartilhado para o id: {id}</p>
        <a href="/" style={{ color: '#2563eb' }}>Voltar</a>
      </div>
    )
  }

  const initialData = {
    ...(data?.dados || {}),
    graficos: data?.graficos || {},
    debug: (data as any)?.debug,
    calculos: (data as any)?.calculos,
  }

  // Renderiza o dashboard completo como componente cliente, hidratado com os dados salvos
  return <PGDASDProcessorIA initialData={initialData as any} />
}