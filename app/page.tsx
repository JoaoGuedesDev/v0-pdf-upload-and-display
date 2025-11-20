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
      const res = await fetch("/api/upload", { method: "POST", body: form, redirect: "follow" })
      if (res.redirected && res.url) {
        window.location.assign(res.url)
        return
      }
      const redirectedUrl = res.headers.get("Location") || ((res.url && res.url !== window.location.href) ? res.url : null)
      if (redirectedUrl) {
        window.location.assign(redirectedUrl)
        return
      }
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
