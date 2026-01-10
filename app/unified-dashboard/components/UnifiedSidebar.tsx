import { MonthlyFile } from '../types'
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Upload, FileText, ChevronRight, Building2, Calendar, DollarSign, AlertTriangle } from "lucide-react"
import { cn, formatPeriod } from "@/lib/utils"
import { HeaderLogo } from "@/components/header-logo"
import { useMemo } from 'react'

interface UnifiedSidebarProps {
  files: MonthlyFile[]
  selectedFileIndex: number | null
  onFileSelect: (index: number) => void
  onAddFile: () => void
  isConsolidatedView: boolean
  onConsolidatedSelect: (cnpj?: string) => void
  isUploading: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  showConsolidatedOption?: boolean
  isOwner?: boolean
  invalidFiles?: string[]
  activeCnpj?: string
}

export function UnifiedSidebar({
  files,
  selectedFileIndex,
  onFileSelect,
  onAddFile,
  isConsolidatedView,
  onConsolidatedSelect,
  isUploading,
  fileInputRef,
  onFileUpload,
  showConsolidatedOption = true,
  isOwner = true,
  invalidFiles = [],
  activeCnpj
}: UnifiedSidebarProps) {
  const groupedFiles = useMemo(() => {
    const groups: Record<string, { name: string, items: { file: MonthlyFile, index: number }[] }> = {}
    
    files.forEach((file, index) => {
      const cnpj = file.data.identificacao.cnpj
      const name = file.data.identificacao.razaoSocial
      
      if (!groups[cnpj]) {
        groups[cnpj] = { name, items: [] }
      }
      groups[cnpj].items.push({ file, index })
    })
    
    return Object.entries(groups).filter(([cnpj]) => {
      // Se tivermos um activeCnpj, filtrar apenas esse grupo
      if (activeCnpj) {
        return cnpj === activeCnpj
      }
      return true
    })
  }, [files, activeCnpj])

  return (
    <div className="w-full lg:w-80 border-l border-border bg-card order-1 lg:order-2 lg:h-screen lg:sticky lg:top-0 print:hidden flex flex-col">
      <div className="p-4 border-b border-border bg-card z-10 flex flex-col gap-4 shrink-0">
        <div className="flex justify-center lg:justify-start">
          <HeaderLogo className="h-8" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Navegação Rápida</h2>
          <p className="text-xs text-muted-foreground">
             {activeCnpj 
               ? groupedFiles[0]?.[1]?.name || 'Empresa Selecionada' 
               : `Todos os Arquivos (${files.length})`
             }
          </p>
          {isOwner && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3 flex items-center gap-2 bg-background hover:bg-muted"
                onClick={onAddFile}
                disabled={isUploading}
              >
                {isUploading ? (
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Processando...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    <span>Adicionar Mês</span>
                  </>
                )}
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileUpload}
                className="hidden"
                accept="application/pdf"
                multiple
              />
            </>
          )}
        </div>
      </div>
      
      <div className="p-4 space-y-2 flex-1 overflow-y-auto">
        <div className="space-y-6">
            {groupedFiles.map(([cnpj, group]) => (
                <div key={cnpj} className="space-y-2">
                    {groupedFiles.length > 0 && (
                        <div className="flex items-center gap-2 px-2 py-1 bg-muted/30 rounded-md sticky top-0 z-10 backdrop-blur-sm">
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            <h3 className="text-xs font-semibold text-muted-foreground truncate" title={group.name}>
                                {group.name}
                            </h3>
                        </div>
                    )}

                    {/* Visão Consolidada por Empresa */}
                    {group.items.length > 1 && (
                        <button
                            onClick={() => onConsolidatedSelect(cnpj)}
                            className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all group",
                                (isConsolidatedView && activeCnpj === cnpj)
                                    ? "bg-[#3A3A3A]/10 dark:bg-[#3A3A3A]/40 border-[#5A5A5A]/30 dark:border-[#5A5A5A]/60 shadow-sm ring-1 ring-[#5A5A5A]/20 dark:ring-[#5A5A5A]/50"
                                    : "hover:bg-muted/50 border-transparent"
                            )}
                        >
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                                (isConsolidatedView && activeCnpj === cnpj) ? "bg-[#3A3A3A] text-white" : "bg-muted text-muted-foreground group-hover:bg-[#3A3A3A]/10"
                            )}>
                                <LayoutDashboard className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={cn("font-medium text-sm truncate", (isConsolidatedView && activeCnpj === cnpj) ? "text-[#3A3A3A] dark:text-[#8A8A8A]" : "text-foreground")}>
                                    Visão Consolidada
                                </p>
                                <p className="text-xs text-muted-foreground truncate">Anual ({group.items.length} meses)</p>
                            </div>
                            {(isConsolidatedView && activeCnpj === cnpj) && <ChevronRight className="w-4 h-4 text-[#3A3A3A] dark:text-[#8A8A8A]" />}
                        </button>
                    )}
                    
                    <div className="space-y-2">
                        {group.items.map(({ file, index }) => {
                            const isSelected = selectedFileIndex === index && !isConsolidatedView;
                            const data = file.data;
                            const periodo = data.identificacao.periodoApuracao;
                            const razaoSocial = data.identificacao.razaoSocial;
                            const receita = data.receitas.receitaPA;

                            return (
                                <button
                                    key={index}
                                    onClick={() => onFileSelect(index)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all group border",
                                        isSelected
                                            ? "bg-primary/5 border-primary/20 shadow-sm"
                                            : "hover:bg-muted/50 border-transparent hover:border-border/50"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
                                        isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/5"
                                    )}>
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3 text-muted-foreground" />
                                            <p className={cn("font-medium text-sm truncate", isSelected ? "text-primary" : "text-foreground")}>
                                                {formatPeriod(periodo)}
                                            </p>
                                        </div>
                                        {/* Company name hidden in items when grouped, but kept if we want to be safe or if only 1 group without header? 
                                            We decided to always show header, so we can hide company here to save space */}
                                        {/* 
                                        <div className="flex items-center gap-1.5">
                                            <Building2 className="w-3 h-3 text-muted-foreground" />
                                            <p className="text-xs text-muted-foreground truncate max-w-[140px]" title={razaoSocial}>
                                                {razaoSocial}
                                            </p>
                                        </div>
                                        */}
                                        <div className="flex items-center gap-1.5">
                                            <DollarSign className="w-3 h-3 text-muted-foreground" />
                                            <p className="text-xs text-muted-foreground font-medium">
                                                {receita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </p>
                                        </div>
                                    </div>
                                    {isSelected && <ChevronRight className="w-4 h-4 text-primary" />}
                                </button>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  )
}
