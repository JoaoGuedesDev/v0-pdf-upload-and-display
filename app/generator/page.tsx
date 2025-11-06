"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { monitor } from "@/lib/monitoring"

// Carregar geradores de forma lazy para isolar responsabilidades
const ModernPDFGeneratorComp = dynamic(() => import("@/components/modern-pdf-generator"), { ssr: false })

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
      </div>

      <div className="rounded-lg border p-6">
        <p className="mb-2">Carregamento lazy do gerador moderno (isolado):</p>
        <ModernPDFGeneratorComp />
      </div>

      <nav className="pt-4">
        <Link className="underline text-primary" href="/">Voltar ao início</Link>
      </nav>
    </div>
  )
}