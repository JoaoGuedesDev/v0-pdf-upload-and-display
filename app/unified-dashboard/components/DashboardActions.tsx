'use client'

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface DashboardActionsProps {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  isUploading: boolean
  onExportPdf: () => void
  className?: string
}

export function DashboardActions({ onUpload, isUploading, onExportPdf, className }: DashboardActionsProps) {


  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button variant="outline" className="flex items-center gap-2" onClick={onExportPdf}>
        <Download className="h-4 w-4" />
        Exportar Relatório PDF
      </Button>
    </div>
  )
}
