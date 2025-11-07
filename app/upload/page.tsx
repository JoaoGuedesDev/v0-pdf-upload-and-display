"use client"

import { FileUpload } from "@/components/file-upload"
import Link from "next/link"
import { monitor } from "@/lib/monitoring"
import { useState } from "react"

export default function UploadPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleFileSelect = async (file: File) => {
    // Logging e métrica por módulo
    monitor.log({ module: 'upload', action: 'file_selected', payload: { name: file.name, size: file.size }, at: new Date().toISOString() })
    monitor.metric('upload', 'files:selected')

    try {
      setIsLoading(true)
      const form = new FormData()
      form.append('pdf', file)
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: form,
        // Allow following 303 redirects to the shared page
        redirect: 'follow',
      })
      // If the API issued a redirect, navigate to the final URL.
      // Browsers often follow 303 and set res.redirected=true with res.url=final URL.
      if (res.redirected && res.url) {
        window.location.assign(res.url)
        return
      }
      // Fallback: some environments don’t expose redirected URL reliably.
      // Try the Location header from the original response.
      const redirectedUrl = res.headers.get('Location') || ((res.url && res.url !== window.location.href) ? res.url : null)
      if (redirectedUrl) {
        window.location.assign(redirectedUrl)
        return
      }
      // Fallback: if API responded with JSON containing error
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.error('[upload] Resposta não OK:', res.status, text)
        alert('Falha ao processar PDF. Tente novamente.')
        return
      }
    } catch (err) {
      console.error('[upload] Exceção no envio:', err)
      alert('Erro ao enviar o PDF. Verifique o arquivo e tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Módulo: Upload de PDF</h1>
        <p className="text-muted-foreground">Página dedicada ao upload e validação básica do arquivo.</p>
      </header>

      <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />

      {/* Removido: download de PDF via servidor */}

      <nav className="pt-4">
        <Link className="underline text-primary" href="/">Voltar ao início</Link>
      </nav>
    </div>
  )
}