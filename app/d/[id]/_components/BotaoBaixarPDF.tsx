"use client"

export function BotaoBaixarPDF({ id }: { id: string }) {
  const abrirPdf = () => {
    if (!id) return
    const base = (process.env.NEXT_PUBLIC_BASE_URL as string | undefined) || window.location.origin
    window.open(`${base}/api/pdf/${id}`, "_blank", "noopener,noreferrer")
  }

  return (
    <button onClick={abrirPdf} className="px-4 py-2 rounded bg-emerald-600 text-white inline-flex items-center">
      Baixar PDF
    </button>
  )
}