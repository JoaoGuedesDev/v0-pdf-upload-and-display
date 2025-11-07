"use client"

import dynamic from "next/dynamic"

// Evita SSR/hidratação de bibliotecas pesadas que dependem de DOM
// (recharts, html-to-image, jsPDF) em ambientes como Vercel.
// O componente será carregado somente no cliente.
const PGDASDProcessorIA = dynamic(() => import("@/components/pgdasd-processor-ia"), { ssr: false })

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <PGDASDProcessorIA />
    </main>
  )
}
