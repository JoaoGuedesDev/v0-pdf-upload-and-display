"use client"

import Link from "next/link"
import { monitor } from "@/lib/monitoring"

export default function GeneratorPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Módulo: Gerador de PDF</h1>
        <p className="text-muted-foreground">Página dedicada à geração de PDFs (demonstração).</p>
      </header>

  <div className="rounded-lg border p-6">
    <p className="mb-4">Use a página de demonstração para visualizar a geração:</p>
    <Link
      className="underline text-primary"
      href="/demo-pdf"
      onClick={() => monitor.log({ module: 'generator', action: 'open_demo', at: new Date().toISOString() })}
    >
      Abrir Demo PDF
    </Link>
    <div className="mt-4">
      <a
        href="/api/make-pdf?url=/generator&fileName=relatorio-generator.pdf"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
      >
        Baixar PDF (servidor)
      </a>
    </div>
  </div>

      {/* Componente de gerador removido */}

      <nav className="pt-4">
        <Link className="underline text-primary" href="/">Voltar ao início</Link>
      </nav>
    </div>
  )
}
