"use client"
import { toast } from "@/components/ui/use-toast"

export function BotaoBaixarPDF({ id }: { id: string }) {
  const abrirPdf = () => {
    toast({ title: "Baixar PDF", description: "Geração de PDF desativada." })
  }

  return (
    <button onClick={abrirPdf} className="px-4 py-2 rounded bg-emerald-600 text-white inline-flex items-center">
      Baixar PDF
    </button>
  )
}