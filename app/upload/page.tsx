"use client"

import { FileUpload } from "@/components/file-upload"
import Link from "next/link"
import { monitor } from "@/lib/monitoring"

export default function UploadPage() {
  const handleFileSelect = async (file: File) => {
    // Logging e métrica por módulo
    monitor.log({ module: 'upload', action: 'file_selected', payload: { name: file.name, size: file.size }, at: new Date().toISOString() })
    monitor.metric('upload', 'files:selected')
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Módulo: Upload de PDF</h1>
        <p className="text-muted-foreground">Página dedicada ao upload e validação básica do arquivo.</p>
      </header>

      <FileUpload onFileSelect={handleFileSelect} isLoading={false} />

      <nav className="pt-4">
        <Link className="underline text-primary" href="/">Voltar ao início</Link>
      </nav>
    </div>
  )
}