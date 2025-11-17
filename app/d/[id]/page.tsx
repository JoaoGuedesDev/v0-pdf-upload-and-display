// Página de servidor padrão

import { getDashboard } from '@/lib/store'
import { headers } from 'next/headers'
import PGDASDProcessorIA from '@/components/pgdasd-processor-ia'
export const dynamic = 'force-dynamic'

export default async function Page({ params }: any) {
  const p = typeof params?.then === 'function' ? await params : params
  const raw = ((p?.id ?? '') as string).toString()
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

  let data = await getDashboard(id)
  if (!data) {
    try {
      const hs = headers()
      const host = hs.get('host') || 'localhost:3000'
      const proto = hs.get('x-forwarded-proto') || 'https'
      const origin = `${proto}://${host}`
      const respA = await fetch(`${origin}/shared/dash-${id}.json`, { cache: 'no-store' })
      if (respA.ok) data = await respA.json()
      if (!data) {
        const respB = await fetch(`${origin}/shared/${id}.json`, { cache: 'no-store' })
        if (respB.ok) data = await respB.json()
      }
    } catch {}
  }
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

  return (
    <main className="px-6 py-4">
      <div className="mt-4">
        <PGDASDProcessorIA initialData={initialData as any} shareId={id} />
      </div>
    </main>
  )
}