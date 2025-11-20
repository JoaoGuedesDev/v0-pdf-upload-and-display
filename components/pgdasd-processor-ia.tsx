"use client"
import React from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

export default function PGDASDProcessorIA(props: any) {
  if (props?.hideDownloadButton) {
    return null
  }
  return (
    <div className={`min-h-screen p-4 sm:p-6 bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100`}>
      <div className="mx-auto max-w-7xl">
        <div className="flex justify-center py-4">
          <Button
            type="button"
            onClick={() => { toast({ title: 'Baixar PDF', description: 'Geração de PDF desativada.' }) }}
            variant={'default'}
            size="lg"
            className={`flex items-center gap-2`}
          >
            <Download className="h-5 w-5" />
            <span>Baixar PDF</span>
          </Button>
        </div>
      </div>
    </div>
  )
}