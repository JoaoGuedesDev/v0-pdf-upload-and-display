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
      form.append("pdf", file)
      const envFlag = String(process.env.NEXT_PUBLIC_USE_N8N || "").toLowerCase()
      const hasWebhook = !!process.env.NEXT_PUBLIC_N8N_UPLOAD_WEBHOOK_URL
      const useN8N = hasWebhook || ["1","true","yes","n8n"].includes(envFlag)
      const url = useN8N ? "/api/upload?n8n=1" : "/api/upload"
      const res = await fetch(url, { method: "POST", body: form, redirect: "follow" })
      if (res.redirected && res.url) {
        const target = (() => {
          try {
            const u = new URL(res.url)
            const sameOrigin = u.origin === window.location.origin
            return sameOrigin ? res.url : `${window.location.origin}${u.pathname}${u.search}${u.hash}`
          } catch {
            return res.url
          }
        })()
        window.location.assign(target)
        return
      }
      const redirectedUrl = res.headers.get("Location") || ((res.url && res.url !== window.location.href) ? res.url : null)
      if (redirectedUrl) {
        const target = (() => {
          try {
            const u = new URL(redirectedUrl, window.location.origin)
            const sameOrigin = u.origin === window.location.origin
            return sameOrigin ? u.toString() : `${window.location.origin}${u.pathname}${u.search}${u.hash}`
          } catch {
            return redirectedUrl
          }
        })()
        window.location.assign(target)
        return
      }
      try {
        const data = await res.json()
        const url2 = data?.redirect || data?.url
        const id = data?.id || data?.shareId || data?.dashboardId
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
        if (id) {
          window.location.assign(`/d/${id}`)
          return
        }
      } catch {}
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={`min-h-screen p-6 bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100`}>
      <div className="mx-auto max-w-7xl space-y-6">
        

        <div className="mt-2">
          <ConfiguracaoProcessamento onProcess={onProcess} loading={loading} className="min-h-[320px]" />
        </div>
      </div>
    </main>
  )
}
import Image from "next/image"
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <Image src="/integra-logo.svg" alt="Integra" width={160} height={48} className="h-10 sm:h-12 w-auto object-contain" />
          </div>
        </div>
