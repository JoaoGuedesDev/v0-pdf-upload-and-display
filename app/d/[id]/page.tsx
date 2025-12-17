// Página de servidor padrão

import { getDashboard, computeOwnerSecret } from '@/lib/store'
import { headers, cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { PGDASDProcessor } from '@/components/pgdasd-processor'
import { AdminAuthWrapper } from '@/components/admin-auth-wrapper'
export const dynamic = 'force-dynamic'

export default async function Page({ params, searchParams }: any) {
  const p = typeof params?.then === 'function' ? await params : params
  const sp = typeof searchParams?.then === 'function' ? await searchParams : searchParams
  const raw = ((p?.id ?? '') as string).toString()
  const id = raw.replace(/[^a-z0-9-]/gi, '')

  if (!id) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Link inválido</h1>
        <p>Esperado formato: /d/abcdef123</p>
        <form action="/" method="get">
          <button type="submit" style={{ color: '#2563eb', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            Voltar
          </button>
        </form>
      </div>
    )
  }

  let data = await getDashboard(id)
  if (!data) {
    try {
      const hs = await headers()
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
        <form action="/" method="get">
          <button type="submit" style={{ color: '#2563eb', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            Voltar
          </button>
        </form>
      </div>
    )
  }

  const name = `dash_admin_${id}`
  const ck = await cookies()
  const hasCookie = !!ck.get(name)
  const adminParam = (sp?.admin ?? '').toString()
  const adminValid = !!adminParam && adminParam === computeOwnerSecret(id)
  if (adminValid) {
    return <AdminAuthWrapper id={id} secret={adminParam} />
  }
  const isOwner = hasCookie || adminValid
  const isPdfGen = sp?.pdf_gen === 'true'

  const initialData = data && data.dados ? {
    ...data.dados,
    graficos: data.graficos || {},
    debug: (data as any)?.debug,
    calculos: (data as any)?.calculos ?? (data as any)?.dados?.calculos,
    metadata: (data as any)?.metadata,
  } : undefined

  return (
    <main className="px-6 py-4">
      <div className="mt-4">
        <PGDASDProcessor initialData={initialData as any} shareId={id} isOwner={isOwner} isPdfGen={isPdfGen} />
      </div>
    </main>
  )
}
