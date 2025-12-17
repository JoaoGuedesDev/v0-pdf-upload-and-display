'use client'

import { useEffect } from 'react'
import { authenticateAdmin } from '@/app/d/[id]/actions'

export function AdminAuthWrapper({ id, secret }: { id: string, secret: string }) {
  useEffect(() => {
    authenticateAdmin(id, secret)
  }, [id, secret])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-slate-500">Autenticando...</p>
    </div>
  )
}
