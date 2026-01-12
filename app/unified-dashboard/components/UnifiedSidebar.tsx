import { MonthlyFile } from '../types'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Upload, FileText, ChevronRight, Building2, Calendar, DollarSign, AlertTriangle, Trash2, CheckCircle, X } from "lucide-react"
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
  onDeleteFile?: (file: MonthlyFile) => void
    queuedFiles?: MonthlyFile[]
    onProcessQueue?: () => void
    onRemoveFromQueue?: (index: number) => void
    activeTab?: 'resumo' | 'visao-geral'
    onTabSelect?: (tab: 'resumo' | 'visao-geral') => void
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
    activeCnpj,
    onDeleteFile,
    queuedFiles = [],
    onProcessQueue,
    onRemoveFromQueue,
    activeTab = 'resumo',
    onTabSelect
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
          <Link href="/" className="transition-opacity hover:opacity-80">
            <HeaderLogo className="h-8" />
          </Link>
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
                className="w-full mt-3 justify-start gap-2 bg-[#007AFF] hover:bg-[#005bb5] text-white shadow-sm"
                onClick={onAddFile}
                disabled={isUploading}
              >
                {isUploading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Adicionar Mês
              </Button>
              
              {queuedFiles.length > 0 && (
                <div className="mt-4 space-y-3 p-3 bg-muted/30 rounded-lg border border-border/50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                     <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Upload className="w-3 h-3" /> Fila ({queuedFiles.length})
                     </h3>
                  </div>
                  
                  <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                    {queuedFiles.map((file, i) => (
                      <div key={i} className="flex items-center justify-between group text-sm p-1.5 rounded hover:bg-background border border-transparent hover:border-border/50 transition-colors">
                         <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="truncate text-xs text-foreground/80" title={file.filename}>
                               {file.filename}
                            </span>
                         </div>
                         {onRemoveFromQueue && (
                           <button 
                             onClick={() => onRemoveFromQueue(i)}
                             className="text-muted-foreground hover:text-destructive p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                              <X className="w-3 h-3" />
                           </button>
                         )}
                      </div>
                    ))}
                  </div>

                  {onProcessQueue && (
                    <Button 
                      size="sm" 
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs shadow-sm"
                      onClick={onProcessQueue}
                    >
                      <CheckCircle className="w-3 h-3 mr-1.5" />
                      Processar Todos
                    </Button>
                  )}
                </div>
              )}
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

                    {/* Resumo Geral Button */}
                    {group.items.length > 1 && (
                        <button
                            onClick={() => {
                                onConsolidatedSelect(cnpj)
                                if (onTabSelect) onTabSelect('resumo')
                            }}
                            className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all group",
                                (isConsolidatedView && activeCnpj === cnpj && activeTab === 'resumo')
                                    ? "bg-[#3A3A3A]/10 dark:bg-[#3A3A3A]/40 border-[#5A5A5A]/30 dark:border-[#5A5A5A]/60 shadow-sm ring-1 ring-[#5A5A5A]/20 dark:ring-[#5A5A5A]/50"
                                    : "hover:bg-muted/50 border-transparent"
                            )}
                        >
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                                (isConsolidatedView && activeCnpj === cnpj && activeTab === 'resumo') ? "bg-[#3A3A3A] text-white" : "bg-muted text-muted-foreground group-hover:bg-[#3A3A3A]/10"
                            )}>
                                <FileText className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={cn("font-medium text-sm truncate", (isConsolidatedView && activeCnpj === cnpj && activeTab === 'resumo') ? "text-[#3A3A3A] dark:text-[#8A8A8A]" : "text-foreground")}>
                                    Resumo Geral
                                </p>
                                <p className="text-xs text-muted-foreground truncate">Capa do Relatório</p>
                            </div>
                            {(isConsolidatedView && activeCnpj === cnpj && activeTab === 'resumo') && <ChevronRight className="w-4 h-4 text-[#3A3A3A] dark:text-[#8A8A8A]" />}
                        </button>
                    )}

                    {/* Visão Consolidada por Empresa */}
                    {group.items.length > 1 && (
                        <button
                            onClick={() => {
                                onConsolidatedSelect(cnpj)
                                if (onTabSelect) onTabSelect('visao-geral')
                            }}
                            className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all group",
                                (isConsolidatedView && activeCnpj === cnpj && activeTab === 'visao-geral')
                                    ? "bg-[#3A3A3A]/10 dark:bg-[#3A3A3A]/40 border-[#5A5A5A]/30 dark:border-[#5A5A5A]/60 shadow-sm ring-1 ring-[#5A5A5A]/20 dark:ring-[#5A5A5A]/50"
                                    : "hover:bg-muted/50 border-transparent"
                            )}
                        >
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                                (isConsolidatedView && activeCnpj === cnpj && activeTab === 'visao-geral') ? "bg-[#3A3A3A] text-white" : "bg-muted text-muted-foreground group-hover:bg-[#3A3A3A]/10"
                            )}>
                                <LayoutDashboard className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={cn("font-medium text-sm truncate", (isConsolidatedView && activeCnpj === cnpj && activeTab === 'visao-geral') ? "text-[#3A3A3A] dark:text-[#8A8A8A]" : "text-foreground")}>
                                    Visão Consolidada
                                </p>
                                <p className="text-xs text-muted-foreground truncate">Anual ({group.items.length} meses)</p>
                            </div>
                            {(isConsolidatedView && activeCnpj === cnpj && activeTab === 'visao-geral') && <ChevronRight className="w-4 h-4 text-[#3A3A3A] dark:text-[#8A8A8A]" />}
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
                                <div
                                    key={index}
                                    onClick={() => onFileSelect(index)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all group border relative cursor-pointer",
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
                                            <p className={cn("font-medium text-sm truncate uppercase", isSelected ? "text-primary" : "text-foreground")}>
                                                {formatPeriod(periodo)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <DollarSign className="w-3 h-3 text-muted-foreground" />
                                            <p className="text-xs text-muted-foreground font-medium">
                                                {receita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {isSelected && !onDeleteFile && <ChevronRight className="w-4 h-4 text-primary" />}
                                    
                                    {onDeleteFile && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-destructive/10 hover:text-destructive h-8 w-8 shadow-sm"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onDeleteFile(file)
                                            }}
                                            title="Remover arquivo"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
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
