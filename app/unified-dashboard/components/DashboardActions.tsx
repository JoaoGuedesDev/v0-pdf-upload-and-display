'use client'

import { useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Upload, Download } from "lucide-react"

interface DashboardActionsProps {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  isUploading: boolean
  onExportPdf: () => void
  className?: string
}

export function DashboardActions({ onUpload, isUploading, onExportPdf, className }: DashboardActionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input 
        type="file" 
        multiple 
        accept=".pdf" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={onUpload} 
      />
      <Button variant="outline" className="flex items-center gap-2" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
        {isUploading ? (
            <>Processando...</>
        ) : (
            <>
                <Upload className="h-4 w-4" />
                Adicionar Arquivos
            </>
        )}
      </Button>
      <Button variant="outline" className="flex items-center gap-2" onClick={onExportPdf}>
        <Download className="h-4 w-4" />
        Exportar Relatório PDF
      </Button>
    </div>
  )
}
