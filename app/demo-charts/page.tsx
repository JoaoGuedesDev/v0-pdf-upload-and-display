"use client"

import Link from "next/link"
import { DonutTributos } from "@/components/DonutTributos"
import { BarrasReceita } from "@/components/BarrasReceita"

export default function DemoChartsPage() {
  return (
    <main className="container mx-auto p-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Demo: Gráficos Chart.js</h1>
        <p className="text-slate-500">Componentes de Donut e Barras com exportação PNG.</p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DonutTributos
          data={[
            { label: "ISS", value: 42180 },
            { label: "ICMS", value: 33350 },
            { label: "INSS/CPP", value: 12680 },
            { label: "COFINS", value: 5520 },
            { label: "PIS", value: 3520 },
            { label: "IRPJ", value: 2750 },
          ]}
        />

        <BarrasReceita
          labels={[
            "01/2024","02/2024","03/2024","04/2024","05/2024","06/2024","07/2024","08/2024","09/2024","10/2024","11/2024","12/2024","01/2025","02/2025","03/2025"
          ]}
          values={[6000,7000,12000,18000,140000,130000,90000,110000,125000,120000,180000,230000,80000,100000,150000]}
        />
      </section>

      <nav className="pt-4">
        <Link className="underline text-primary" href="/">Voltar ao início</Link>
      </nav>
    </main>
  )
}