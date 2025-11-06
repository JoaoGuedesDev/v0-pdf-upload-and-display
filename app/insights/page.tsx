"use client"

import { useState } from "react"
import Link from "next/link"
import { monitor } from "@/lib/monitoring"

export default function InsightsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const sample = {
    tributos: { IRPJ: 100, CSLL: 80, COFINS: 200, PIS_Pasep: 50, INSS_CPP: 300, ICMS: 150, IPI: 0, ISS: 120, Total: 1000 },
    cenario: "misto",
    receitas: { rbt12: 480000 },
    graficos: { receitaLine: { labels: ["01/2024", "02/2024", "03/2024"], values: [10000, 12000, 15000] } },
    calculos: { aliquotaEfetiva: 5.2, margemLiquida: 94.8 },
  }

  const handleRequest = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      monitor.log({ module: 'insights', action: 'request_start', payload: { sample }, at: new Date().toISOString() })
      const resp = await fetch("/api/insights", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dasData: sample }) })
      const data = await resp.json()
      setResult(data)
      monitor.log({ module: 'insights', action: 'request_success', payload: { ok: true }, at: new Date().toISOString() })
    } catch (e: any) {
      setError(e?.message || "Erro ao obter insights")
      monitor.log({ module: 'insights', action: 'request_error', payload: { message: e?.message }, at: new Date().toISOString() })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Módulo: Insights Tributários</h1>
        <p className="text-muted-foreground">Página dedicada ao consumo da API de insights.</p>
      </header>

      <div className="rounded-lg border p-6 space-y-4">
        <p>Enviar amostra para <code>/api/insights</code>:</p>
        <button className="px-4 py-2 rounded bg-primary text-primary-foreground" onClick={handleRequest} disabled={loading}>
          {loading ? "Buscando..." : "Obter Insights"}
        </button>
        {error && <p className="text-destructive">{error}</p>}
        {result && (
          <pre className="text-sm bg-secondary p-3 rounded overflow-auto max-h-64">{JSON.stringify(result, null, 2)}</pre>
        )}
      </div>

      <nav className="pt-4">
        <Link className="underline text-primary" href="/">Voltar ao início</Link>
      </nav>
    </div>
  )
}
