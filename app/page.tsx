"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ConfiguracaoProcessamento } from "@/components/dashboard/ConfiguracaoProcessamento"

export default function Home() {
  const [loading, setLoading] = useState(false)

  const onProcess = async (file: File) => {
    try {
      setLoading(true)
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/process-pdf", { method: "POST", body: form })
      if (!res.ok) throw new Error("Falha ao processar PDF via n8n")
      const data = await res.json().catch(() => null)
      const url2 = data?.dashboardUrl || data?.redirect || data?.url
      const id = data?.dashboardCode || data?.id || data?.shareId || data?.dashboardId
      if (url2) {
        const target = (() => {
          try {
            const u = new URL(url2, window.location.origin)
            const sameOrigin = u.origin === window.location.origin
            return sameOrigin ? u.toString() : `${window.location.origin}${u.pathname}${u.search}${u.hash}`
          } catch {
            return url2
          }
        })()
        window.location.assign(target)
        return
      }
      // Evita navegar por id sem URL quando a persistência não está pronta (ex.: Vercel sem KV)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={`min-h-screen p-6 bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100`}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <img
              src="/shared/integra-logo.png"
              alt="Integra Soluções Empresariais"
              className="h-10 sm:h-12 w-auto object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/integra-logo.svg' }}
            />
          </div>
        </div>

        <div className="mt-2">
          <ConfiguracaoProcessamento onProcess={onProcess} loading={loading} className="min-h-[320px]" />
        </div>
      </div>
    </main>
  )
}
