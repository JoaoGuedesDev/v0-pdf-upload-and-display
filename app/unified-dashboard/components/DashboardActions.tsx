'use client'

import { Button } from "@/components/ui/button"
import { Download, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

interface DashboardActionsProps {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  isUploading: boolean
  onExportPdf: () => void
  className?: string
  isSaving?: boolean
}

export function DashboardActions({ onUpload, isUploading, onExportPdf, className, isSaving }: DashboardActionsProps) {
  const { theme, setTheme } = useTheme()

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button 
        variant="ghost" 
        className="bg-[#007AFF]/20 text-[#007AFF] hover:bg-[#007AFF]/30 dark:bg-[#007AFF]/40 dark:text-[#FFFFFF] gap-2" 
        onClick={onExportPdf}
        disabled={isSaving}
      >
        {isSaving ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {isSaving ? 'Salvando...' : 'Exportar Relatório PDF'}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="h-9 w-9 rounded-full"
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Alternar tema</span>
      </Button>
    </div>
  )
}
