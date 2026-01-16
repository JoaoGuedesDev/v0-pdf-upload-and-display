'use client'

import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useTheme } from "next-themes"
import { MonthlyFile, ReceitasAnteriores, UnifiedView, Tributos } from '../types'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ArrowLeft, AlertTriangle, ChevronRight, ChevronLeft, BarChart3, LayoutDashboard, Upload, X, CheckCircle, ArrowUpRight, ArrowDownRight, Minus, FileText, Building2, Grid, Trash2, Download } from "lucide-react"
import { cn, formatPeriod } from "@/lib/utils"
import { UnifiedSidebar } from './UnifiedSidebar'
import { ReportCover } from './ReportCover'
import { PGDASDProcessor } from "@/components/pgdasd-processor"
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ChartData
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { DashboardActions } from './DashboardActions'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import ChartDataLabels from 'chartjs-plugin-datalabels'

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ChartDataLabels
)

interface AnnualDashboardProps {
    files: MonthlyFile[]
    onBack?: () => void
    dashboardCode?: string
    initialViewIndex?: number
    initialTargetCnpj?: string
    isPdfGen?: boolean
    onFilesUpdated?: (files: MonthlyFile[]) => void
    receitas_anteriores?: ReceitasAnteriores
    isOwner?: boolean
    invalidFiles?: string[]
    onInvalidFilesUpdated?: (files: string[]) => void
    isEmbedded?: boolean
}

interface PartnerConfig {
    id: string
    name: string
    percentage: number
}

const PartnerRow = ({ 
    partner, 
    totalDistribution, 
    isPdfGen, 
    onUpdate, 
    onRemove 
}: {
    partner: PartnerConfig
    totalDistribution: number
    isPdfGen: boolean
    onUpdate: (id: string, field: 'name' | 'percentage', value: string) => void
    onRemove: (id: string) => void
}) => {
    const [percentageInput, setPercentageInput] = useState(
        partner.percentage ? String(partner.percentage).replace('.', ',') : ''
    )
    const [nameInput, setNameInput] = useState(partner.name || '')

    // Update local state if prop changes (e.g. from initial load or external reset)
    // We compare with current parsed value to avoid overriding user input while typing if they match conceptually
    useEffect(() => {
        const currentNum = Number(percentageInput.replace(',', '.'))
        if (!isNaN(currentNum) && Math.abs(currentNum - partner.percentage) > 0.001) {
             setPercentageInput(String(partner.percentage).replace('.', ','))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [partner.percentage])

    // We initialize nameInput with partner.name but do NOT sync back from props in useEffect
    // to avoid cursor jumps/reverts during fast typing if parent re-renders are delayed.
    // Since this component is the primary editor for this field, local state is sufficient.
    // If the partner ID changes, the component is remounted and state is reset anyway.

    const amount = (totalDistribution * (partner.percentage || 0)) / 100

    return (
        <TableRow className="align-middle group">
            <TableCell className="py-1">
                {isPdfGen ? (
                    <span className="font-medium">{partner.name || 'Sócio'}</span>
                ) : (
                    <input
                        value={nameInput}
                        onChange={e => {
                            setNameInput(e.target.value)
                            onUpdate(partner.id, 'name', e.target.value)
                        }}
                        className="w-full bg-transparent border-b border-transparent hover:border-border focus:border-primary px-2 py-1 text-xs outline-none transition-colors"
                        placeholder="Nome do sócio"
                    />
                )}
            </TableCell>
            <TableCell className="py-1 text-right">
                {isPdfGen ? (
                    <span>{(partner.percentage || 0).toFixed(2)}%</span>
                ) : (
                    <div className="relative flex items-center justify-end">
                        <input
                            value={percentageInput}
                            onChange={e => {
                                setPercentageInput(e.target.value)
                                // Optional: Real-time update if valid number and not ending in comma/dot
                                const val = e.target.value
                                if (val && !val.endsWith(',') && !val.endsWith('.')) {
                                    onUpdate(partner.id, 'percentage', val)
                                }
                            }}
                            onBlur={() => onUpdate(partner.id, 'percentage', percentageInput)}
                            className="w-20 bg-transparent border-b border-transparent hover:border-border focus:border-primary px-2 py-1 text-right text-xs outline-none transition-colors"
                            placeholder="0,00"
                        />
                        <span className="text-muted-foreground ml-1">%</span>
                    </div>
                )}
            </TableCell>
            <TableCell className="py-1 text-right">
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                    {amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
            </TableCell>
            {!isPdfGen && (
                <TableCell className="py-1 text-right w-10">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onRemove(partner.id)}
                    >
                        <Trash2 className="w-3 h-3" />
                    </Button>
                </TableCell>
            )}
        </TableRow>
    )
}


function computeRevenueBreakdownForFile(file: MonthlyFile) {
    const dados = file.data as any
    let detalhe = dados.calculos?.analise_aliquota?.detalhe || []
    const parcelasGlobal = dados.calculos?.analise_aliquota?.parcelas_ajuste || []

    const normalizeAnexo = (v: any): number => {
        if (typeof v === 'number') return v
        const s = String(v || '').trim().toUpperCase()
        if (!s) return 0
        const n = Number(s)
        if (!isNaN(n)) return n
        const clean = s.replace('ANEXO', '').trim()
        const n2 = Number(clean)
        if (!isNaN(n2)) return n2
        const romanos: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5 }
        if (romanos[clean]) return romanos[clean]
        return 0
    }

    if (detalhe.length > 0 && parcelasGlobal.length > 0) {
        detalhe = detalhe.map((d: any) => {
            if (!d.parcelas_ajuste || d.parcelas_ajuste.length === 0) {
                const anexoNum = normalizeAnexo(d.anexo || d.anexo_numero)
                const matching = parcelasGlobal.filter((p: any) => normalizeAnexo(p.numero) === anexoNum)
                if (matching.length > 0) {
                    return { ...d, parcelas_ajuste: matching }
                }
            }
            return d
        })
    }

    let servicos = 0
    let mercadorias = 0
    let industria = 0

    if (detalhe.length > 0) {
        detalhe.forEach((d: any) => {
            const anexo = normalizeAnexo(d.anexo)
            const valor = d.parcelas_ajuste?.reduce((acc: number, p: any) => acc + (Number(p.valor) || 0), 0) || 0

            if ([1].includes(anexo)) {
                mercadorias += valor
            } else if ([2].includes(anexo)) {
                industria += valor
            } else if ([3, 4, 5].includes(anexo)) {
                servicos += valor
            }
        })
    } else {
        const rpa = dados.receitas?.receitaPA || 0
        if (dados.cenario === 'servicos') servicos = rpa
        else if (dados.cenario === 'mercadorias') mercadorias = rpa
        else if (dados.cenario === 'misto') {
            const atividades = dados.debug?.atividades || []
            if (atividades.length > 0) {
                atividades.forEach((at: any) => {
                    const nome = String(at.nome || at.name || at.descricao || '').toLowerCase()
                    const val = Number(at.receita_bruta_informada || 0)
                    if (nome.includes('servi')) servicos += val
                    else mercadorias += val
                })
            } else {
                const tServ = (dados.tributosServicosInterno?.Total || 0) + (dados.tributosServicosExterno?.Total || 0)
                const tMerc = (dados.tributosMercadoriasInterno?.Total || 0) + (dados.tributosMercadoriasExterno?.Total || 0)
                const tInd = (dados.tributosIndustriaInterno?.Total || 0) + (dados.tributosIndustriaExterno?.Total || 0)
                const totalT = tServ + tMerc + tInd

                if (totalT > 0) {
                    servicos = rpa * (tServ / totalT)
                    mercadorias = rpa * (tMerc / totalT)
                    industria = rpa * (tInd / totalT)
                } else {
                    servicos = rpa
                }
            }
        }
    }

    return { servicos, mercadorias, industria }
}


export function AnnualDashboard({ files, onBack, dashboardCode, initialViewIndex, initialTargetCnpj, isPdfGen, onFilesUpdated, receitas_anteriores, isOwner = true, invalidFiles, onInvalidFilesUpdated, isEmbedded: propIsEmbedded, partnerConfigs: initialPartnerConfigs }: AnnualDashboardProps) {
    const [localFiles, setLocalFiles] = useState<MonthlyFile[]>(files)
    const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(initialViewIndex ?? null)
    
    // Determine active CNPJ for filtering dashboard data
    // If no initialTargetCnpj is provided, try to infer from initialViewIndex or first file
    const [activeCnpj, setActiveCnpj] = useState<string | undefined>(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            const urlCnpj = params.get('target_cnpj')
            if (urlCnpj) return decodeURIComponent(urlCnpj)
        }

        if (initialTargetCnpj) return initialTargetCnpj
        if (initialViewIndex !== undefined && files[initialViewIndex]) {
            return files[initialViewIndex].data.identificacao.cnpj
        }
        return files[0]?.data.identificacao.cnpj
    })

    const partnersStorageKey = dashboardCode ? `partners_${dashboardCode}` : 'partners'
    const [partnerConfigs, setPartnerConfigs] = useState<Record<string, PartnerConfig[]>>(() => {
        // Try reading from URL params (for PDF generation context)
        // This takes precedence over initialPartnerConfigs/localStorage to ensure PDF has latest data
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            const urlConfigs = params.get('partner_configs')
            if (urlConfigs) {
                try {
                    return JSON.parse(decodeURIComponent(urlConfigs))
                } catch (e) {
                    console.error('Failed to parse partner_configs from URL', e)
                }
            }
        }

        if (initialPartnerConfigs) return initialPartnerConfigs

        if (typeof window === 'undefined') return {}
        try {
            const raw = window.localStorage.getItem(partnersStorageKey)
            if (!raw) return {}
            const parsed = JSON.parse(raw)
            if (parsed && typeof parsed === 'object') return parsed
            return {}
        } catch {
            return {}
        }
    })

    const [isUploading, setIsUploading] = useState(false)
    const [uploadErrors, setUploadErrors] = useState<string[]>([])
    const [showErrorModal, setShowErrorModal] = useState(false)
    const [pendingFiles, setPendingFiles] = useState<MonthlyFile[]>([])
    const [showInvalidFilesModal, setShowInvalidFilesModal] = useState(false)
    
    // Queue State
    const [queuedFiles, setQueuedFiles] = useState<MonthlyFile[]>([])

    // PDF Selection State
    const [showPdfSelectionModal, setShowPdfSelectionModal] = useState(false)
    const [pdfSelectedPeriodIds, setPdfSelectedPeriodIds] = useState<Set<string>>(new Set())

    const [urlFilteredPeriods, setUrlFilteredPeriods] = useState<Set<string> | null>(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            const p = params.get('periods')
            if (p) return new Set(decodeURIComponent(p).split(',').map(s => s.trim()))
        }
        return null
    })

    const [urlUnifiedCnpjs] = useState<string[] | null>(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            const p = params.get('unified_cnpjs')
            if (p) return decodeURIComponent(p).split(',').map(s => s.trim()).filter(Boolean)
        }
        return null
    })
    
    const [urlUnifiedLabel] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            const label = params.get('unified_label')
            if (label) return decodeURIComponent(label)
        }
        return null
    })
    
    useEffect(() => {
        if (typeof window === 'undefined') return
        try {
            window.localStorage.setItem(partnersStorageKey, JSON.stringify(partnerConfigs))
        } catch {}
    }, [partnerConfigs, partnersStorageKey])

    const onlyConsolidated = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('only_consolidated') === 'true' : false

    useEffect(() => {
        if (invalidFiles && invalidFiles.length > 0) {
            setShowInvalidFilesModal(true)
        }
    }, [invalidFiles])

    // Chart visibility state
    const [visibleCharts, setVisibleCharts] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            const visibleParam = params.get('visible')
            if (visibleParam) {
                const parts = visibleParam.split(',')
                return {
                    quarterly: parts.includes('quarterly'),
                    semiannual: parts.includes('semiannual'),
                    annual: parts.includes('annual')
                }
            }
        }
        return {
            quarterly: true,
            semiannual: true,
            annual: true
        }
    })


    // Tab State for Consolidated View
    const [activeTab, setActiveTab] = useState<'resumo' | 'visao-geral' | 'distribuicao-resultados'>(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            const tab = params.get('active_tab')
            if (tab === 'resumo' || tab === 'visao-geral' || tab === 'distribuicao-resultados') return tab as any
        }
        return 'resumo'
    })

    const fileInputRef = useRef<HTMLInputElement>(null)
    const { theme } = useTheme()
    const [resumoZoom, setResumoZoom] = useState<number | null>(null)
    const [visaoZoom, setVisaoZoom] = useState<number | null>(null)
    const [distZoom, setDistZoom] = useState<number | null>(null)
    const resumoRef = useRef<HTMLDivElement | null>(null)
    const visaoRef = useRef<HTMLDivElement | null>(null)
    const distRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        // Only update if files prop changes and is different (simple length check or deep compare if needed)
        // For now, assume prop update takes precedence
        if (files.length !== localFiles.length && files !== localFiles) {
            setLocalFiles(files)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [files])

    // State for Consolidated View (Multi-Company)
    const [selectedUnifyCnpjs, setSelectedUnifyCnpjs] = useState<Set<string>>(new Set())
    const [showUnifyModal, setShowUnifyModal] = useState(false)
    const [unifiedViews, setUnifiedViews] = useState<UnifiedView[]>([])

    useEffect(() => {
        if (isPdfGen && onlyConsolidated && urlUnifiedCnpjs && urlUnifiedCnpjs.length > 0 && unifiedViews.length === 0) {
            const id = activeCnpj || 'UNIFIED_URL'
            let label = urlUnifiedLabel || ''
            if (!label) {
                const summarizeName = (full?: string | null) => {
                    if (!full) return ''
                    let n = full.trim()
                    n = n.replace(/\b(LTDA|LTD\.?|ME|EPP|S\/A|SA)\b\.?/gi, '').trim()
                    if (n.length > 24) n = n.slice(0, 21).trimEnd() + '...'
                    return n
                }
                const companyNames = urlUnifiedCnpjs
                    .map(cnpj => {
                        const f = localFiles.find(file => file.data.identificacao.cnpj === cnpj)
                        return summarizeName(f?.data.identificacao.razaoSocial)
                    })
                    .filter(Boolean) as string[]
                label = companyNames.length > 0 
                    ? companyNames.join('\n') 
                    : `Consolidado (${urlUnifiedCnpjs.length})`
            }
            setUnifiedViews([{ id, label, cnpjs: urlUnifiedCnpjs }])
        }
    }, [isPdfGen, onlyConsolidated, urlUnifiedCnpjs, urlUnifiedLabel, unifiedViews, activeCnpj, localFiles])

    // Filter files for the current view (Consolidated Charts/Tables)
    // We only want to show data for the ACTIVE company
    const companyFiles = useMemo(() => {
        const activeUnifiedView = unifiedViews.find(v => v.id === activeCnpj)
        if (activeUnifiedView) {
             const relevantFiles = localFiles.filter(f => activeUnifiedView.cnpjs.includes(f.data.identificacao.cnpj))
             
             // Merge logic for UNIFIED view
             const groupedByPeriod = new Map<string, MonthlyFile[]>()
             relevantFiles.forEach(f => {
                 const p = f.data.identificacao.periodoApuracao
                 if (!groupedByPeriod.has(p)) groupedByPeriod.set(p, [])
                 groupedByPeriod.get(p)?.push(f)
             })

             const merged: MonthlyFile[] = []
             groupedByPeriod.forEach((files, period) => {
                 if (files.length === 0) return

                 // Base clone from first file
                 const base = JSON.parse(JSON.stringify(files[0]))
                 base.data.identificacao.razaoSocial = activeUnifiedView.label
                 base.data.identificacao.cnpj = activeUnifiedView.id
                 base.filename = `Consolidado_${period.replace(/\//g, '-')}`

                 // Sum others
                 for (let i = 1; i < files.length; i++) {
                     const f = files[i]
                     
                     // Sum Receitas
                     if (base.data.receitas && f.data.receitas) {
                        base.data.receitas.receitaPA = (base.data.receitas.receitaPA || 0) + (f.data.receitas.receitaPA || 0)
                        base.data.receitas.rbt12 = (base.data.receitas.rbt12 || 0) + (f.data.receitas.rbt12 || 0)
                     }
                     
                     // Sum Tributos
                     const tBase = base.data.tributos || {}
                     const tCurr = f.data.tributos || {}
                     Object.keys(tBase).forEach(key => {
                         const k = key as keyof Tributos
                         if (typeof tBase[k] === 'number') {
                             const valBase = (tBase[k] as number) || 0;
                             const valCurr = (tCurr[k] as number) || 0;
                             (tBase as any)[k] = valBase + valCurr;
                         }
                     })
                     
                     // Merge Activity Details (Concat)
                     const dBase = base.data.calculos?.analise_aliquota?.detalhe || []
                     const dCurr = f.data.calculos?.analise_aliquota?.detalhe || []
                     if (base.data.calculos?.analise_aliquota) {
                        base.data.calculos.analise_aliquota.detalhe = [...dBase, ...dCurr]
                     } else if (base.data.calculos && dCurr.length > 0) {
                         base.data.calculos.analise_aliquota = { detalhe: dCurr }
                     }

                     // Sum Tributos Breakdown
                    const breakdowns = [
                        'tributosMercadoriasInterno', 'tributosMercadoriasExterno',
                        'tributosIndustriaInterno', 'tributosIndustriaExterno',
                        'tributosServicosInterno', 'tributosServicosExterno'
                    ] as const
                    breakdowns.forEach(bk => {
                        const bBase = base.data[bk] as any
                        const bCurr = f.data[bk] as any
                        if (bBase && bCurr) {
                            Object.keys(bBase).forEach(k => {
                                if (typeof bBase[k] === 'number') {
                                    bBase[k] += (bCurr[k] || 0)
                                }
                            })
                        } else if (bCurr) {
                            base.data[bk] = JSON.parse(JSON.stringify(bCurr))
                        }
                    })

                    // Helper to parse values (same as in consolidatedData)
                    const parseValue = (val: any) => {
                         if (typeof val === 'number') return val
                         if (typeof val === 'string') {
                             let v = val.replace(/[R$\s]/g, '')
                             if (v.includes(',') && !v.includes('.')) {
                                 v = v.replace(',', '.')
                             } else if (v.includes('.') && v.includes(',')) {
                                 const lastDot = v.lastIndexOf('.')
                                 const lastComma = v.lastIndexOf(',')
                                 if (lastComma > lastDot) { 
                                     v = v.replace(/\./g, '').replace(',', '.')
                                 } else { 
                                     v = v.replace(/,/g, '')
                                 }
                             }
                             return Number(v) || 0
                         }
                         return 0
                    }

                    // Merge Receitas Anteriores (History)
                    const mergeHistoryList = (listBase: any[], listCurr: any[], keyName: string, valName: string) => {
                         if (!listCurr) return listBase || []
                         if (!listBase) return JSON.parse(JSON.stringify(listCurr))
                         
                         const map = new Map<string, number>()
                         
                         // Helper to normalize period
                         const norm = (p: string) => p ? p.trim() : ''
                         
                         // Add Base
                         listBase.forEach(item => {
                             const k = norm(item[keyName])
                             if (k) map.set(k, (map.get(k) || 0) + parseValue(item[valName]))
                         })
                         
                         // Add Curr
                         listCurr.forEach(item => {
                             const k = norm(item[keyName])
                             if (k) map.set(k, (map.get(k) || 0) + parseValue(item[valName]))
                         })
                         
                         // Reconstruct
                         return Array.from(map.entries()).map(([k, v]) => ({ [keyName]: k, [valName]: v }))
                    }

                    // Merge n8n format
                    if (base.data.receitas_anteriores || f.data.receitas_anteriores) {
                         base.data.receitas_anteriores = base.data.receitas_anteriores || {}
                         const fRec = f.data.receitas_anteriores || {}
                         
                         base.data.receitas_anteriores.mercado_interno = mergeHistoryList(
                             base.data.receitas_anteriores.mercado_interno || [],
                             fRec.mercado_interno || [],
                             'mes', 'valor'
                         )
                         base.data.receitas_anteriores.mercado_externo = mergeHistoryList(
                             base.data.receitas_anteriores.mercado_externo || [],
                             fRec.mercado_externo || [],
                             'mes', 'valor'
                         )
                    }

                    // Merge das-parse format (LEGACY - removed to fix types)
                    // if (base.data.historico || f.data.historico) { ... }
                 }
                 merged.push(base)
             })
             
             return merged
        }

        if (!activeCnpj) return localFiles
        return localFiles.filter(f => f.data.identificacao.cnpj === activeCnpj)

    }, [localFiles, activeCnpj, unifiedViews])

    // Filtered files for PDF Pages / Tables (respects user selection)
    const filteredCompanyFiles = useMemo(() => {
        let filtered = companyFiles
        if (urlFilteredPeriods && urlFilteredPeriods.size > 0) {
            filtered = filtered.filter(f => urlFilteredPeriods.has(f.data.identificacao.periodoApuracao))
        }
        return filtered
    }, [companyFiles, urlFilteredPeriods])

    // Sort company files for display/charts
    // NOTE: sortedFiles is used for "Pages" and "Totals". It SHOULD be filtered.
    const sortedFiles = useMemo(() => {
        return [...filteredCompanyFiles].sort((a, b) => {
            const getMonthYear = (d: string) => {
                if (!d) return 0
                const parts = d.split(' ')[0].split('/')
                // MM/YYYY
                if (parts.length === 2) return parseInt(parts[1]) * 12 + parseInt(parts[0])
                // DD/MM/YYYY
                if (parts.length === 3) return parseInt(parts[2]) * 12 + parseInt(parts[1])
                return 0
            }
            return getMonthYear(a.data?.identificacao?.periodoApuracao || '') - getMonthYear(b.data?.identificacao?.periodoApuracao || '')
        })
    }, [filteredCompanyFiles])
    
    // UNFILTERED sorted files for Charts (to show full year context)
    const allSortedFiles = useMemo(() => {
        return [...companyFiles].sort((a, b) => {
            const getMonthYear = (d: string) => {
                if (!d) return 0
                const parts = d.split(' ')[0].split('/')
                if (parts.length === 2) return parseInt(parts[1]) * 12 + parseInt(parts[0])
                if (parts.length === 3) return parseInt(parts[2]) * 12 + parseInt(parts[1])
                return 0
            }
            return getMonthYear(a.data?.identificacao?.periodoApuracao || '') - getMonthYear(b.data?.identificacao?.periodoApuracao || '')
        })
    }, [companyFiles])

    // Handle Sidebar Selection
    // If user selects a file from a DIFFERENT company, we need to switch activeCnpj
    // and set the selectedFileIndex to the correct index within sortedFiles (if we were using sortedFiles index)
    // BUT: UnifiedSidebar returns the index from `files` (localFiles).
    // AnnualDashboard logic (below) uses `sortedFiles[selectedFileIndex]`.
    // This is a mismatch if `selectedFileIndex` comes from sidebar (global index) but we use it on `sortedFiles` (filtered).
    
    // CORRECTION: UnifiedSidebar receives `localFiles` (all files).
    // So `onFileSelect` returns index in `localFiles`.
    // We need to map this global index to:
    // 1. Update `activeCnpj` if needed.
    // 2. Update `selectedFileIndex` to be the index within `sortedFiles`? 
    //    Wait, `selectedFileIndex` is used as `sortedFiles[selectedFileIndex]`.
    //    This implies `selectedFileIndex` MUST be an index into `sortedFiles`.
    
    //    BUT `UnifiedSidebar` passes index from `files`.
    //    So we need to change how `selectedFileIndex` is interpreted OR how it is set.
    
    // Let's change `selectedFileIndex` to be the GLOBAL index (index in `localFiles`).
    // Then derive `currentFile` from `localFiles[selectedFileIndex]`.
    // And if `currentFile` is set, `activeCnpj` should match it.
    
    // However, existing logic uses `sortedFiles`.
    // `sortedFiles` is `companyFiles` sorted.
    
    // If we want to keep existing logic mostly intact:
    // We should keep `selectedFileIndex` as index into `sortedFiles` IF possible, 
    // BUT `UnifiedSidebar` is generic and shows ALL files.
    
    // BETTER APPROACH:
    // Let's separate "Sidebar Selection" from "View State".
    // When sidebar selects a file:
    //   1. Get the file from `localFiles[index]`.
    //   2. Set `activeCnpj` = file.cnpj.
    //   3. Find where this file is in `sortedFiles` (which will be recomputed with new Cnpj).
    //   4. Set `selectedFileIndex` to that new index.
    
    // Check for multiple companies to toggle Consolidated View availability
    const uniqueCnpjs = useMemo(() => {
        const cnpjs = new Set(localFiles.map(f => f.data.identificacao.cnpj))
        return Array.from(cnpjs)
    }, [localFiles])
    
    const uniqueCompanies = useMemo(() => {
        const map = new Map<string, string>()
        localFiles.forEach(f => {
            const cnpj = f.data.identificacao.cnpj
            const name = f.data.identificacao.razaoSocial
            if (cnpj && name) map.set(cnpj, name)
        })
        return Array.from(map.entries()).map(([cnpj, name]) => ({ cnpj, name }))
    }, [localFiles])

    const headerCompanies = useMemo(() => {
        const activeUnifiedView = unifiedViews.find(v => v.id === activeCnpj)
        if (!activeUnifiedView) return undefined
        const nameMap = new Map(uniqueCompanies.map(c => [c.cnpj, c.name]))
        return activeUnifiedView.cnpjs.map(cnpj => ({
            cnpj,
            name: nameMap.get(cnpj) || cnpj
        }))
    }, [unifiedViews, activeCnpj, uniqueCompanies])
    
    const isMultiCompany = uniqueCnpjs.length > 1

    const [isSaving, setIsSaving] = useState(false)

    const persistChanges = async (newFiles: MonthlyFile[]) => {
        if (!dashboardCode || !isOwner) return
        
        setIsSaving(true)
        try {
            await fetch(`/api/dashboard/${dashboardCode}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: newFiles })
            })
        } catch (e) {
            console.error("Failed to persist changes", e)
        } finally {
            setIsSaving(false)
        }
    }

    // Logic to auto-select file if only one exists, or allow consolidated if multiple
    useEffect(() => {
        // If there is only 1 file, force select it (no consolidated view needed)
        if (sortedFiles.length === 1 && selectedFileIndex === null) {
             setSelectedFileIndex(0)
             setTargetFilename(sortedFiles[0].filename)
        }
        // If there are multiple files, we ALLOW selectedFileIndex === null (Consolidated View)
        // So we don't need to do anything here.
    }, [sortedFiles.length, selectedFileIndex])

    const handleSidebarSelect = (globalIndex: number) => {
        const file = localFiles[globalIndex]
        if (!file) return
        
        const newCnpj = file.data.identificacao.cnpj
        
        // If company changed, we update activeCnpj
        if (newCnpj !== activeCnpj) {
            setActiveCnpj(newCnpj)
            // We need to wait for sortedFiles to update? 
            // In React, state updates batch.
            // But we can just find the file in the new filtered list.
            // The `sortedFiles` memo will re-run.
            // But we can't easily predict the new index here without duplicating sort logic.
            
            // Instead, we can set a "pending selection" or just rely on finding the file by ID/Name?
            // `MonthlyFile` doesn't have a unique ID, but filename is usually unique.
        }
        
        // We want to enter "Single Month View" for this file.
        // We need to find the index of this file within the (potentially new) sortedFiles.
        // Since we can't synchronously access the new sortedFiles, we might need a useEffect 
        // OR change `selectedFileIndex` to store the FILENAME, not index.
        
        // Given the constraints and legacy code, let's try to find the index.
        // Actually, if we switch CNPJ, the `sortedFiles` will change.
        // We can use `useEffect` to sync selection if we store "targetFilename".
    }

    // Refactored State for Selection
    // We'll store `targetFilename` when selection changes, and resolve it to index in `sortedFiles`.
    const [targetFilename, setTargetFilename] = useState<string | null>(
        initialViewIndex !== undefined && files[initialViewIndex] ? files[initialViewIndex].filename : null
    )
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

    useEffect(() => {
        if (!isPdfGen) return
        if (typeof window === 'undefined') return

        const measure = (el: HTMLDivElement | null, setter: (v: number) => void) => {
            if (!el) return
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0
            if (!viewportHeight) return
            const safePageHeight = viewportHeight * 0.8
            const prevZoom = (el.style as any).zoom
            ;(el.style as any).zoom = '1'
            const rect = el.getBoundingClientRect()
            if (rect.height <= safePageHeight) {
                setter(1)
                ;(el.style as any).zoom = prevZoom || ''
                return
            }
            const raw = rect.height > 0 ? safePageHeight / rect.height : 1
            const clamped = Math.max(0.4, Math.min(0.9, raw))
            setter(clamped)
            ;(el.style as any).zoom = prevZoom || ''
        }

        const id = window.setTimeout(() => {
            measure(resumoRef.current, v => setResumoZoom(v))
            measure(visaoRef.current, v => setVisaoZoom(v))
            measure(distRef.current, v => setDistZoom(v))
        }, 100)

        return () => window.clearTimeout(id)
    }, [isPdfGen])

    // History State to remember selected file per Company
    const [viewHistory, setViewHistory] = useState<Record<string, string | null>>({})

    // Update history when selection changes
    useEffect(() => {
        if (activeCnpj) {
            setViewHistory(prev => ({
                ...prev,
                [activeCnpj]: targetFilename
            }))
        }
    }, [targetFilename, activeCnpj])

    // Sync selectedFileIndex with targetFilename
    useEffect(() => {
        if (targetFilename) {
            const idx = sortedFiles.findIndex(f => f.filename === targetFilename)
            if (idx !== -1) {
                setSelectedFileIndex(idx)
            } else {
                // File not found in current sorted list (shouldn't happen if logic is correct, unless file deleted)
                // If we just switched company, sortedFiles should update to include it.
                // If it's still -1, maybe it's not in sortedFiles yet?
            }
        } else {
            setSelectedFileIndex(null)
        }
    }, [targetFilename, sortedFiles])

    const onFileSelect = (globalIndex: number) => {
        const file = localFiles[globalIndex]
        if (file) {
            if (file.data.identificacao.cnpj !== activeCnpj) {
                setActiveCnpj(file.data.identificacao.cnpj)
            }
            setTargetFilename(file.filename)
        }
    }

    // Override handleFileUpload to use localFiles (already does)
    
    // ... (keep existing handleFileUpload)

    // ... (keep existing data processing)

    // UPDATE: sortedFiles definition was:
    // const sortedFiles = [...localFiles].sort(...) 
    // We need to replace it with the memoized filtered one above.
    
    // UPDATE: isConsolidated logic
    // const isConsolidated = selectedFileIndex === null
    // const currentFile = selectedFileIndex !== null ? sortedFiles[selectedFileIndex] : null
    
    // This logic still holds if `sortedFiles` is the company-filtered list and `selectedFileIndex` is index into it.

    const handleDeleteFile = (fileToDelete: MonthlyFile) => {
        setLocalFiles(prev => {
            const updated = prev.filter(f => f !== fileToDelete)
            if (onFilesUpdated) setTimeout(() => onFilesUpdated(updated), 0)
            persistChanges(updated)
            return updated
        })
        if (selectedFileIndex !== null && sortedFiles[selectedFileIndex] === fileToDelete) {
            setSelectedFileIndex(null)
            setTargetFilename(null)
        }
    }

    const handleProcessQueue = () => {
        setLocalFiles(prev => {
            const updated = [...prev, ...queuedFiles]
            if (onFilesUpdated) setTimeout(() => onFilesUpdated(updated), 0)
            persistChanges(updated)
            return updated
        })
        setQueuedFiles([])
    }

    const handleRemoveFromQueue = (index: number) => {
        setQueuedFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return

        setIsUploading(true)
        setIsUploading(true)
        setUploadErrors([])
        setPendingFiles([])

        try {
            const formData = new FormData()
            Array.from(e.target.files).forEach(file => {
                formData.append('file', file)
            })

            const res = await fetch('/api/parse-files', {
                method: 'POST',
                body: formData
            })

            const data = await res.json()

            if (data.invalidFiles && data.invalidFiles.length > 0) {
                const newInvalidFiles = data.invalidFiles as string[]
                const currentInvalidFiles = invalidFiles || []
                const combined = [...currentInvalidFiles, ...newInvalidFiles]
                const unique = Array.from(new Set(combined))
                
                if (onInvalidFilesUpdated) {
                    onInvalidFilesUpdated(unique)
                }
            }

            const errors: string[] = []
            const validFiles: MonthlyFile[] = []

            if (data.error) {
                // Instead of throwing, push to errors and continue if we have files
                errors.push(data.error)
            }

            const newFiles = data.files as { filename: string, data: any }[]

            // Validation - Check for duplicates within same company
            
            newFiles.forEach(nf => {
                const fCnpj = nf.data?.identificacao?.cnpj
                const fPeriod = nf.data?.identificacao?.periodoApuracao

                // Check Duplicate in existing files OR in queued files
                const isDuplicate = localFiles.some(f => 
                    f.data?.identificacao?.cnpj === fCnpj && 
                    f.data?.identificacao?.periodoApuracao === fPeriod
                ) || queuedFiles.some(f => 
                    f.data?.identificacao?.cnpj === fCnpj && 
                    f.data?.identificacao?.periodoApuracao === fPeriod
                )

                if (isDuplicate) {
                    errors.push(`Arquivo '${nf.filename}': Período ${fPeriod} já existe para a empresa ${fCnpj}.`)
                    return
                }

                // Check Duplicate within new batch
                if (validFiles.some(vf => 
                    vf.data?.identificacao?.cnpj === fCnpj && 
                    vf.data?.identificacao?.periodoApuracao === fPeriod
                )) {
                    errors.push(`Arquivo '${nf.filename}': Período ${fPeriod} duplicado no upload atual.`)
                    return
                }

                validFiles.push({
                    ...nf,
                    id: crypto.randomUUID(),
                    uploadDate: new Date().toISOString()
                })
            })

            if (errors.length > 0) {
                setUploadErrors(errors)
                setPendingFiles(validFiles)
                setShowErrorModal(true)
            } else if (validFiles.length > 0) {
                // No errors, add to queue
                setQueuedFiles(prev => [...prev, ...validFiles])
            }

        } catch (err: any) {
            setUploadErrors([err.message || "Erro ao processar arquivos"])
            setShowErrorModal(true)
        } finally {
            setIsUploading(false)
            // Reset input value to allow selecting same files again if needed
            if (e.target) e.target.value = ''
        }
    }

    const handleForceProcess = () => {
        if (pendingFiles.length > 0) {
            setQueuedFiles(prev => [...prev, ...pendingFiles])
        }
        setShowErrorModal(false)
        setPendingFiles([])
        setUploadErrors([])
    }

    // Unified DataLabels Configuration
    const datalabelsConfig = useMemo(() => ({
        align: 'end' as const,
        anchor: 'end' as const,
        clamp: true,
        clip: false,
        offset: 4,
        color: 'white',
        backgroundColor: (context: any) => {
             return context.dataset.backgroundColor || context.dataset.borderColor || 'rgba(0,0,0,0.7)'
        },
        borderRadius: 4,
        padding: 4,
        textStrokeColor: 'transparent',
        textStrokeWidth: 0,
        font: { weight: 'bold' as const, size: 10 },
        formatter: (value: number | null) => {
            if (value === null || value === undefined || value === 0 || value < 0) return ''
            return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        }
    }), [])

    const openPdfSelection = () => {
        // Initialize with all files for the current company
        const relevantFiles = localFiles.filter(f => f.data.identificacao.cnpj === activeCnpj)
        const allIds = new Set(relevantFiles.map(f => f.data.identificacao.periodoApuracao))
        setPdfSelectedPeriodIds(allIds)
        setShowPdfSelectionModal(true)
    }

    const handleSingleFileDownload = async (file: MonthlyFile) => {
        setIsGeneratingPdf(true)
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        
        let currentCode = dashboardCode

        try {
            // If no dashboard code (local mode), create a temporary one
            if (!currentCode) {
                setIsSaving(true)
                const res = await fetch('/api/dashboard/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ files: localFiles, partnerConfigs })
                })
                
                if (!res.ok) throw new Error('Falha ao salvar dados temporários')
                
                const data = await res.json()
                if (data.code) {
                    currentCode = data.code
                } else {
                    throw new Error('Código de dashboard não retornado')
                }
            }

            // Construct base path with the code
            let basePath = `/d/${currentCode}`
            
            // Get existing params
            const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
            
            // Force PDF generation param
            params.set('pdf_gen', 'true')
            
            // Set specific period
            const period = file.data.identificacao.periodoApuracao
            params.set('periods', period)
            
            // Update target_cnpj
            if (activeCnpj) {
                params.set('target_cnpj', activeCnpj)
                if (activeCnpj === 'UNIFIED') {
                    params.set('unify', Array.from(selectedUnifyCnpjs).join(','))
                }
            }
            
            // Remove visible params as Single View handles its own visibility
            params.delete('visible')

            const path = `${basePath}?${params.toString()}`

            const rs = file.data.identificacao.razaoSocial || 'Empresa'
            const safeName = rs.replace(/[^a-z0-9à-ú .-]/gi, '_')
            const filename = `${safeName} - ${period}.pdf`.replace(/[^a-z0-9à-ú .-]/gi, '_')

            const url = `${origin}/api/pdf?path=${encodeURIComponent(path)}&type=screen&w=1600&scale=1&download=true&filename=${encodeURIComponent(filename)}`

            const response = await fetch(url)
            if (!response.ok) throw new Error('Falha na geração do PDF')
            
            const blob = await response.blob()
            const downloadUrl = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = downloadUrl
            a.download = filename
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(downloadUrl)
            document.body.removeChild(a)

        } catch (e: any) {
            console.error(e)
            alert("Erro ao gerar PDF: " + (e.message || "Erro desconhecido"))
        } finally {
            setIsSaving(false)
            setIsGeneratingPdf(false)
        }
    }

    const handleConsolidatedDownload = async () => {
        setIsGeneratingPdf(true)
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        
        let currentCode = dashboardCode

        try {
            // If no dashboard code (local mode), create a temporary one
            if (!currentCode) {
                setIsSaving(true)
                const res = await fetch('/api/dashboard/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ files: localFiles, partnerConfigs })
                })
                
                if (!res.ok) throw new Error('Falha ao salvar dados temporários')
                
                const data = await res.json()
                if (data.code) {
                    currentCode = data.code
                } else {
                    throw new Error('Código de dashboard não retornado')
                }
            }

            // Construct base path with the code
            let basePath = `/d/${currentCode}`
            
            // Get existing params
            const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
            
            // Force PDF generation param
            params.set('pdf_gen', 'true')
            params.set('only_consolidated', 'true')
            params.set('active_tab', activeTab)

            const activeUnifiedView = unifiedViews.find(v => v.id === activeCnpj)
            if (activeUnifiedView) {
                params.set('unified_cnpjs', activeUnifiedView.cnpjs.join(','))
                params.set('unified_label', activeUnifiedView.label)
            }
            
            // Clear periods to ensure we get the full consolidated view data
            params.delete('periods')
            
            // Update target_cnpj
            if (activeCnpj) {
                params.set('target_cnpj', activeCnpj)
            }
            
            // Ensure annual view is visible
            params.set('visible', 'annual')

            if (partnerConfigs && Object.keys(partnerConfigs).length > 0) {
                 params.set('partner_configs', encodeURIComponent(JSON.stringify(partnerConfigs)))
            }

            const path = `${basePath}?${params.toString()}`

            const rs = sortedFiles[0]?.data?.identificacao?.razaoSocial || 'Empresa'
            const safeName = rs.replace(/[^a-z0-9à-ú .-]/gi, '_')
            const filename = `Relatorio_Consolidado_${safeName}.pdf`

            const url = `${origin}/api/pdf?path=${encodeURIComponent(path)}&type=screen&w=1600&scale=1&download=true&filename=${encodeURIComponent(filename)}`

            const response = await fetch(url)
            if (!response.ok) throw new Error('Falha na geração do PDF')
            
            const blob = await response.blob()
            const downloadUrl = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = downloadUrl
            a.download = filename
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(downloadUrl)
            document.body.removeChild(a)

        } catch (e: any) {
            console.error(e)
            alert("Erro ao gerar PDF: " + (e.message || "Erro desconhecido"))
        } finally {
            setIsSaving(false)
            setIsGeneratingPdf(false)
        }
    }

    const handleExportPdf = async (selectedPeriods?: Set<string>) => {
        setIsGeneratingPdf(true)
        const sorted = [...sortedFiles]
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        
        let currentCode = dashboardCode

        try {
            // If no dashboard code (local mode), create a temporary one
            if (!currentCode) {
                setIsSaving(true)
                const res = await fetch('/api/dashboard/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ files: localFiles, partnerConfigs })
                })
                
                if (!res.ok) throw new Error('Falha ao salvar dados temporários')
                
                const data = await res.json()
                if (data.code) {
                    currentCode = data.code
                } else {
                    throw new Error('Código de dashboard não retornado')
                }
            }

            // Construct base path with the code
            let basePath = `/d/${currentCode}`
            
            // Get existing params
            const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
            
            // Force PDF generation param
            params.set('pdf_gen', 'true')

            const activeUnifiedView = unifiedViews.find(v => v.id === activeCnpj)
            if (activeUnifiedView) {
                params.set('unified_cnpjs', activeUnifiedView.cnpjs.join(','))
                params.set('unified_label', activeUnifiedView.label)
            }
            
            // Update target_cnpj
            if (activeCnpj) {
                params.set('target_cnpj', activeCnpj)
            }
            
            // Update periods
            if (selectedPeriods && selectedPeriods.size > 0) {
                params.set('periods', Array.from(selectedPeriods).join(','))
            } else if (urlFilteredPeriods && urlFilteredPeriods.size > 0) {
                params.set('periods', Array.from(urlFilteredPeriods).join(','))
            } else {
                params.delete('periods')
            }

            // Update visible charts
            const visibleParts = []
            if (visibleCharts.quarterly) visibleParts.push('quarterly')
            if (visibleCharts.semiannual) visibleParts.push('semiannual')
            if (visibleCharts.annual) visibleParts.push('annual')
            
            if (visibleParts.length > 0) {
                params.set('visible', visibleParts.join(','))
            } else {
                params.delete('visible')
            }

            if (partnerConfigs && Object.keys(partnerConfigs).length > 0) {
                 params.set('partner_configs', encodeURIComponent(JSON.stringify(partnerConfigs)))
            }

            const path = `${basePath}?${params.toString()}`

            const rs = sorted[0]?.data?.identificacao?.razaoSocial || 'Empresa'
            const safeName = rs.replace(/[^a-z0-9à-ú .-]/gi, '_')
            const filename = `Relatorio_Anual_${safeName}.pdf`

            const url = `${origin}/api/pdf?path=${encodeURIComponent(path)}&type=screen&w=1600&scale=1&download=true&filename=${encodeURIComponent(filename)}`

            const response = await fetch(url)
            if (!response.ok) throw new Error('Falha na geração do PDF')
            
            const blob = await response.blob()
            const downloadUrl = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = downloadUrl
            a.download = filename
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(downloadUrl)
            document.body.removeChild(a)

        } catch (e: any) {
            console.error(e)
            alert("Erro ao gerar PDF: " + (e.message || "Erro desconhecido"))
        } finally {
            setIsSaving(false)
            setIsGeneratingPdf(false)
        }
    }

    // Listen for export messages from parent
    useEffect(() => {
        const handler = (event: MessageEvent) => {
            if (event.data?.type === 'EXPORT_PDF') {
                openPdfSelection()
            }
            if (event.data?.type === 'OPEN_UNIFY_MODAL') {
                setShowUnifyModal(true)
            }
        }
        window.addEventListener('message', handler)
        return () => window.removeEventListener('message', handler)
    }, [sortedFiles, activeCnpj, visibleCharts, dashboardCode, localFiles])

    const [isEmbedded, setIsEmbedded] = useState(propIsEmbedded || false)
    useEffect(() => {
        setIsEmbedded(propIsEmbedded || window.self !== window.top)
    }, [propIsEmbedded])

    const isDark = theme === 'dark'
    const chartTheme = useMemo(() => ({
        grid: isDark ? '#007AFF' : '#e2e8f0', // Azul elétrico vibrante
        text: isDark ? '#FFFFFF' : '#3A3A3A', // Branco puro / Preto profundo
        tooltipBg: isDark ? 'rgba(58, 58, 58, 0.95)' : 'rgba(255, 255, 255, 0.95)', // Azul marinho profundo
        tooltipTitle: isDark ? '#FFFFFF' : '#3A3A3A',
        tooltipBody: isDark ? '#00C2FF' : '#3A3A3A', // Ciano vibrante / Preto profundo
        tooltipBorder: isDark ? '#007AFF' : '#e2e8f0'
    }), [isDark])

    // REMOVED: Old sortedFiles definition (replaced by memoized one)
    // const sortedFiles = [...localFiles].sort(...)



    // Determine if we are showing a specific file or the consolidated view
    const isConsolidated = selectedFileIndex === null
    const currentFile = selectedFileIndex !== null ? sortedFiles[selectedFileIndex] : null

    // --- Aggregation Logic ---
    // Helper to parse date (Moved up to be available for consolidatedData)
    const parsePeriod = (p: string) => {
        const parts = p.split(' ')[0].split('/')
        if (parts.length === 2) return { m: parseInt(parts[0]), y: parseInt(parts[1]) }
        if (parts.length === 3) return { m: parseInt(parts[1]), y: parseInt(parts[2]) }
        return { m: 0, y: 0 }
    }

    const consolidatedData = useMemo(() => {
        const map = new Map<string, number>() // "YYYY-MM" -> Value

        // Helper to parse history label
        const parseHistoryLabel = (lbl: string) => {
            if (!lbl) return null
            
            // Try standard date formats
            // DD/MM/YYYY or MM/YYYY
            const partsSlash = lbl.split('/')
            if (partsSlash.length === 3) {
                 const m = parseInt(partsSlash[1])
                 const y = parseInt(partsSlash[2])
                 if (!isNaN(m) && !isNaN(y)) return { m, y }
            }
            if (partsSlash.length === 2) {
                // MM/YYYY
                const m = parseInt(partsSlash[0])
                const y = parseInt(partsSlash[1])
                if (!isNaN(m) && !isNaN(y)) return { m, y: y < 100 ? 2000 + y : y }
            }
            
            // YYYY-MM-DD or YYYY-MM
            const partsDash = lbl.split('-')
            if (partsDash.length === 3) {
                const y = parseInt(partsDash[0])
                const m = parseInt(partsDash[1])
                if (!isNaN(m) && !isNaN(y)) return { m, y }
            }
            if (partsDash.length === 2) {
                // YYYY-MM
                const y = parseInt(partsDash[0])
                const m = parseInt(partsDash[1])
                if (!isNaN(m) && !isNaN(y)) return { m, y }
            }

            return null
        }

        // 1. Populate from explicit files (Highest priority)
        allSortedFiles.forEach(f => {
            const { m, y } = parsePeriod(f.data.identificacao.periodoApuracao)
            if (m && y) {
                const key = `${y}-${String(m).padStart(2, '0')}`
                // Always overwrite with explicit file data as it is the source of truth for that month
                map.set(key, f.data.receitas.receitaPA || 0)
            }
        })

        // 2. Populate from receitas_anteriores (Explicitly requested by user: n8n data format)
        // Format example: { mes: "01/2024", valor: 59442.2 }
        // We also support 'historico' format from direct PDF parsing to ensure compatibility.
        const processExternalData = (items: any[]) => {
             if (!items || !Array.isArray(items)) return

             const parseValue = (val: any) => {
                 if (typeof val === 'number') return val
                 if (typeof val === 'string') {
                     // Remove "R$", spaces, and handle both comma/dot formats
                     let v = val.replace(/[R$\s]/g, '')
                     if (v.includes(',') && !v.includes('.')) {
                         v = v.replace(',', '.')
                     } else if (v.includes('.') && v.includes(',')) {
                         const lastDot = v.lastIndexOf('.')
                         const lastComma = v.lastIndexOf(',')
                         if (lastComma > lastDot) { // 1.000,00
                             v = v.replace(/\./g, '').replace(',', '.')
                         } else { // 1,000.00
                             v = v.replace(/,/g, '')
                         }
                     }
                     return Number(v) || 0
                 }
                 return 0
             }

             items.forEach(item => {
                 const p = parseHistoryLabel(item.mes || item.periodo)
                 if (p) {
                     const key = `${p.y}-${String(p.m).padStart(2, '0')}`
                     const val = parseValue(item.valor)
                     // Only overwrite if we have a valid positive value
                     // This allows merging history fragments without erasing data with 0s
                     if (val > 0) map.set(key, val)
                 }
             })
        }

        // Apply logic to first and last file as requested
        // We process both 'receitas_anteriores' (n8n) and 'historico' (das-parse)
        if (allSortedFiles.length > 0) {
            const filesToProcess = [allSortedFiles[0]]
            if (allSortedFiles.length > 1) {
                filesToProcess.push(allSortedFiles[allSortedFiles.length - 1])
            }
            
            filesToProcess.forEach(f => {
                const d = f.data as any
                // 1. Check receitas_anteriores (n8n standard - snake_case)
                if (d.receitas_anteriores) {
                    processExternalData(d.receitas_anteriores.mercado_interno)
                    processExternalData(d.receitas_anteriores.mercado_externo)
                }
                // 2. Check historico (das-parse standard - camelCase)
                if (d.historico) {
                    processExternalData(d.historico.mercadoInterno)
                    processExternalData(d.historico.mercadoExterno)
                }
            })
        }
        
        // Also check global prop just in case it's passed directly
        if (receitas_anteriores) {
            if (receitas_anteriores.mercado_interno) processExternalData(receitas_anteriores.mercado_interno)
            if (receitas_anteriores.mercado_externo) processExternalData(receitas_anteriores.mercado_externo)
        }

        // REMOVED: Strict filtering based on user selection
        // We want charts to show FULL HISTORY even if we are generating PDF for specific months.
        
        return map
    }, [allSortedFiles, receitas_anteriores])

    const years = useMemo(() => {
        const s = new Set<number>()
        // From consolidated data
        consolidatedData.forEach((val, key) => {
            // Filter out noise (< 1.00)
            if (val < 1) return

            const y = parseInt(key.split('-')[0])
            if (!isNaN(y)) s.add(y)
        })
        return Array.from(s).sort((a, b) => a - b)
    }, [consolidatedData])

    // Monthly Data By Year (Updated to use consolidatedData)
    const monthlyDataByYear = useMemo(() => {
        const map = new Map<number, { labels: string[], revenue: (number | null)[], taxes: (number | null)[], interest: (number | null)[] }>()
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

        years.forEach(y => {
            const labels: string[] = []
            const revenue: (number | null)[] = []
            const taxes: (number | null)[] = []
            const interest: (number | null)[] = []

            // We iterate 1-12 to ensure all months are present (fixed axis)
            for (let m = 1; m <= 12; m++) {
                labels.push(monthNames[m - 1])
                
                const key = `${y}-${String(m).padStart(2, '0')}`
                const val = consolidatedData.get(key)
                
                // Revenue
                // If val is undefined, we push 0 (was null)
                if (val !== undefined) {
                    revenue.push(val)
                } else {
                    revenue.push(0)
                }
                
                // Taxes & Interest logic
                // Attempt to find explicit file for taxes
                const file = allSortedFiles.find(f => {
                    const p = parsePeriod(f.data.identificacao.periodoApuracao)
                    return p.y === y && p.m === m
                })
                
                const tVal = file?.data.tributos.Total || 0
                taxes.push(tVal)

                let interestVal = 0
                if (file) {
                    const totalToPay = Number((file.data as any).valorTotalDAS || 0)
                    const totalTaxesVal = Number(tVal)
                    if (totalToPay > totalTaxesVal + 0.05) {
                        interestVal = totalToPay - totalTaxesVal
                    }
                }
                interest.push(interestVal)
            }

            // Only add year if there is at least some revenue data
            if (revenue.some(v => v !== null && v > 0)) {
                 map.set(y, { labels, revenue, taxes, interest })
            }
        })
        return map
    }, [years, consolidatedData, allSortedFiles])

    // Aggregated Data for Comparison (Multi-View)
    const allComparisonData = useMemo(() => {
        const colors = ['#007AFF', '#00C2FF', '#3D5AFE', '#1A2C4E', '#FFFFFF'] // Paleta Vibrante

        const generateData = (gran: 'quarterly' | 'semiannual') => {
            let labels: string[] = []
            let bucketCount = 0

            if (gran === 'quarterly') {
                labels = ['1º Trim', '2º Trim', '3º Trim', '4º Trim']
                bucketCount = 4
            } else if (gran === 'semiannual') {
                labels = ['1º Semestre', '2º Semestre']
                bucketCount = 2
            }

            const datasets: any[] = []

            years.forEach((y, idx) => {
                const data = new Array(bucketCount).fill(0)
                
                // Iterate months 1-12 for this year
                for (let m = 1; m <= 12; m++) {
                     const key = `${y}-${String(m).padStart(2, '0')}`
                     const val = consolidatedData.get(key) || 0
                     
                     if (val > 0) {
                        if (gran === 'quarterly') {
                            const q = Math.ceil(m / 3) - 1
                            if (q >= 0 && q < 4) data[q] += val
                        } else if (gran === 'semiannual') {
                            const s = m <= 6 ? 0 : 1
                            data[s] += val
                        }
                     }
                }

                // Replace 0 with null to hide points
                const finalData = data.map(v => v < 1 ? null : v)

                if (finalData.some(v => v !== null)) {
                    datasets.push({
                        label: `${y}`,
                        data: finalData,
                        backgroundColor: colors[idx % colors.length],
                        borderRadius: 4,
                        maxBarThickness: 70,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8,
                        datalabels: {
                            display: true,
                            labels: {
                            value: {
                                ...datalabelsConfig,
                                align: 'start' as const,
                                anchor: 'end' as const,
                                offset: 4,
                                backgroundColor: 'transparent',
                                color: 'white',
                                formatter: (val: any) => {
                                    if (val === null || val === undefined || val === 0) return ''
                                    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                }
                            },
                            variation: {
                                ...datalabelsConfig,
                                align: 'end' as const,
                                anchor: 'end' as const,
                                offset: 4,
                                font: { weight: 'bold' as const, size: 11 },
                                display: (ctx: any) => ctx.datasetIndex > 0,
                                color: (ctx: any) => {
                                    const dsIdx = ctx.datasetIndex
                                    if (dsIdx === 0) return 'transparent'
                                    
                                    const curr = ctx.dataset.data[ctx.dataIndex]
                                    const prev = ctx.chart.data.datasets[dsIdx - 1].data[ctx.dataIndex]
                                    
                                    if (!curr || !prev) return 'transparent'
                                    return curr >= prev ? '#059669' : '#EF4444'
                                },
                                formatter: (val: any, ctx: any) => {
                                    const dsIdx = ctx.datasetIndex
                                    if (dsIdx === 0) return ''
                                    
                                    const curr = ctx.dataset.data[ctx.dataIndex]
                                    const prev = ctx.chart.data.datasets[dsIdx - 1].data[ctx.dataIndex]
                                    
                                    if (!curr || !prev) return ''
                                    
                                    const diff = curr - prev
                                    const pct = (diff / prev) * 100
                                    const symbol = diff >= 0 ? '▲' : '▼'
                                    
                                    return `${symbol} ${Math.abs(pct).toFixed(2)}%\n${diff > 0 ? '+' : ''}${diff.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                                }
                            }
                        }
                        },
                        // Prevent chartjs from connecting lines over nulls (for line charts) or showing empty bars
                        spanGaps: false 
                    })
                }
            })
            return { labels, datasets }
        }

        // Generate Annual (Year vs Year) Data
        const generateAnnualData = () => {
            const labels = years.map(String)
            const data = years.map(y => {
                let sum = 0
                for(let m=1; m<=12; m++) {
                    sum += consolidatedData.get(`${y}-${String(m).padStart(2, '0')}`) || 0
                }
                return sum // Return sum (even if 0)
            })
            
            return {
                labels,
                datasets: [{
                    label: 'Receita Anual',
                    data,
                    backgroundColor: years.map((_, i) => colors[i % colors.length]),
                    borderRadius: 4,
                    maxBarThickness: 70,
                    datalabels: {
                        display: true,
                        labels: {
                            value: {
                                ...datalabelsConfig,
                                align: 'start' as const,
                                anchor: 'end' as const,
                                offset: 4,
                                backgroundColor: 'transparent',
                                color: 'white',
                                formatter: (val: any) => {
                                    if (val === null || val === undefined || val === 0) return ''
                                    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                }
                            },
                            variation: {
                                ...datalabelsConfig,
                                align: 'end' as const,
                                anchor: 'end' as const,
                                offset: 4,
                                font: { weight: 'bold' as const, size: 11 },
                                display: (ctx: any) => ctx.dataIndex > 0,
                                color: (ctx: any) => {
                                    const idx = ctx.dataIndex
                                    if (idx === 0) return 'transparent'
                                    
                                    const curr = ctx.dataset.data[idx]
                                    const prev = ctx.dataset.data[idx - 1]
                                    
                                    if (!curr || !prev) return 'transparent'
                                    return curr >= prev ? '#059669' : '#EF4444'
                                },
                                formatter: (val: any, ctx: any) => {
                                    const idx = ctx.dataIndex
                                    if (idx === 0) return ''
                                    
                                    const curr = ctx.dataset.data[idx]
                                    const prev = ctx.dataset.data[idx - 1]
                                    
                                    if (!curr || !prev) return ''
                                    
                                    const diff = curr - prev
                                    const pct = (diff / prev) * 100
                                    const symbol = diff >= 0 ? '▲' : '▼'
                                    
                                    return `${symbol} ${Math.abs(pct).toFixed(2)}%\n${diff > 0 ? '+' : ''}${diff.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                                }
                            }
                        }
                    }
                }]
            }
        }

        return {
            quarterly: generateData('quarterly'),
            semiannual: generateData('semiannual'),
            annual: generateAnnualData()
        }
    }, [years, consolidatedData, datalabelsConfig])


    // Calculate totals for consolidated view
    const totalRevenue = sortedFiles.reduce((acc, file) => acc + (file.data.receitas.receitaPA || 0), 0)
    const averageRevenue = sortedFiles.length > 0 ? totalRevenue / sortedFiles.length : 0
    const totalTaxes = sortedFiles.reduce((acc, file) => acc + (file.data.tributos.Total || 0), 0)
    const averageTaxes = sortedFiles.length > 0 ? totalTaxes / sortedFiles.length : 0
    const averageTaxRate = totalRevenue > 0 ? (totalTaxes / totalRevenue) * 100 : 0

    // Grid Visibility State
    const [showGrid, setShowGrid] = useState(false)

    // Chart Options Boilerplate
    const chartOptions = useMemo(() => ({
        animation: isPdfGen ? { duration: 0 } : {},
        layout: {
            padding: {
                top: 40,
                right: 40,
                left: 30, // Increased from 25 to 30
                bottom: 10
            }
        },
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: { 
                    color: isDark ? '#FFFFFF' : chartTheme.text, // Legenda branca no modo noturno
                    padding: 10,
                    boxWidth: 10,
                    usePointStyle: true,
                    pointStyle: 'circle'
                }
            },
            title: { display: false },
            tooltip: {
                backgroundColor: chartTheme.tooltipBg,
                titleColor: chartTheme.tooltipTitle,
                bodyColor: chartTheme.tooltipBody,
                borderColor: chartTheme.tooltipBorder,
                borderWidth: 1,
                callbacks: {
                    label: function (context: any) {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (context.parsed.y !== null) {
                            label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                        }
                        return label;
                    }
                }
            },
            datalabels: {
                // Line chart specific overrides: No stroke, allow overflow
                ...datalabelsConfig,
                align: 'end' as const,
                anchor: 'end' as const,
                color: chartTheme.text,
                textStrokeWidth: 0,
                clamp: false,
            }
        },
        scales: {
            y: {
                grace: '20%',
                grid: { 
                    display: showGrid,
                    color: showGrid ? chartTheme.grid : 'transparent',
                    borderColor: chartTheme.grid
                },
                border: { display: true, color: chartTheme.grid },
                ticks: { 
                    color: chartTheme.text, 
                    callback: (v: any) => {
                        if (v < 0) return ''
                        return new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v)
                    },
                    padding: 25,
                }
            },
            x: {
                grid: { 
                    display: showGrid,
                    color: showGrid ? chartTheme.grid : 'transparent',
                    borderColor: chartTheme.grid
                },
                border: { display: true, color: chartTheme.grid },
                ticks: { color: chartTheme.text }
            }
        }
    }), [theme, chartTheme, showGrid, datalabelsConfig, isPdfGen])

    const monthlyRevenueBreakdown = useMemo(() => {
        return sortedFiles.map(file => {
            const breakdown = computeRevenueBreakdownForFile(file)
            return {
                month: file.data.identificacao.periodoApuracao.split(' ')[0],
                servicos: breakdown.servicos,
                mercadorias: breakdown.mercadorias,
                industria: breakdown.industria
            }
        })
    }, [sortedFiles])

    const isUnifiedView = useMemo(
        () => unifiedViews.some(v => v.id === activeCnpj),
        [unifiedViews, activeCnpj]
    )

    const totalDistribution = useMemo(() => {
        let total = 0
        sortedFiles.forEach((file, index) => {
            const breakdown = monthlyRevenueBreakdown[index]
            const irpjTotal = file.data.tributos?.IRPJ || 0
            const baseMerc = breakdown.mercadorias * 0.08
            const baseServ = breakdown.servicos * 0.32
            const totalBase = baseMerc + baseServ
            const irpjMerc = totalBase > 0 ? (irpjTotal * (baseMerc / totalBase)) : 0
            const irpjServ = totalBase > 0 ? (irpjTotal * (baseServ / totalBase)) : 0
            const distMerc = baseMerc - irpjMerc
            const distServ = baseServ - irpjServ
            total += distMerc + distServ
        })
        return total
    }, [sortedFiles, monthlyRevenueBreakdown])

    const perCompanyDistribution = useMemo(() => {
        const result: Record<string, { name: string; amount: number }> = {}
        const activeUnifiedView = unifiedViews.find(v => v.id === activeCnpj)
        if (!activeUnifiedView) return result

        const periodFilter = urlFilteredPeriods

        activeUnifiedView.cnpjs.forEach(cnpj => {
            const companyFiles = localFiles.filter(f => {
                if (f.data.identificacao.cnpj !== cnpj) return false
                if (periodFilter && periodFilter.size > 0) {
                    return periodFilter.has(f.data.identificacao.periodoApuracao)
                }
                return true
            })

            let total = 0
            companyFiles.forEach(file => {
                const breakdown = computeRevenueBreakdownForFile(file)
                const irpjTotal = file.data.tributos?.IRPJ || 0
                const baseMerc = breakdown.mercadorias * 0.08
                const baseServ = breakdown.servicos * 0.32
                const totalBase = baseMerc + baseServ
                const irpjMerc = totalBase > 0 ? (irpjTotal * (baseMerc / totalBase)) : 0
                const irpjServ = totalBase > 0 ? (irpjTotal * (baseServ / totalBase)) : 0
                const distMerc = baseMerc - irpjMerc
                const distServ = baseServ - irpjServ
                total += distMerc + distServ
            })

            if (total > 0) {
                const anyFile = localFiles.find(f => f.data.identificacao.cnpj === cnpj)
                const fullName = anyFile?.data.identificacao.razaoSocial || cnpj
                let name = fullName.trim()
                name = name.replace(/\b(LTDA|LTD\.?|ME|EPP|S\/A|SA)\b\.?/gi, '').trim()
                if (!name) name = cnpj
                result[cnpj] = { name, amount: total }
            }
        })

        return result
    }, [unifiedViews, activeCnpj, localFiles, urlFilteredPeriods])

    const currentViewKey = activeCnpj || 'DEFAULT'
    const currentPartners: PartnerConfig[] = partnerConfigs[currentViewKey] || []
    const partnersSumPercent = currentPartners.reduce((acc, p) => acc + (p.percentage || 0), 0)

    const unifiedPartnersSummary = useMemo(() => {
        const activeUnifiedView = unifiedViews.find(v => v.id === activeCnpj)
        if (!activeUnifiedView) return null

        const companies = activeUnifiedView.cnpjs
            .map(cnpj => ({
                cnpj,
                name: perCompanyDistribution[cnpj]?.name || cnpj,
                distribution: perCompanyDistribution[cnpj]?.amount || 0
            }))
            .filter(c => c.distribution > 0)

        if (companies.length === 0) return { companies: [] as Array<{ cnpj: string; name: string; distribution: number }>, partners: [] as any[] }

        const nameMap = new Map<string, string>()
        companies.forEach(company => {
            const list = partnerConfigs[company.cnpj] || []
            list.forEach(p => {
                const raw = (p.name || '').trim()
                if (!raw) return
                const key = raw.toLowerCase()
                if (!nameMap.has(key)) nameMap.set(key, raw)
            })
        })

        const partners = Array.from(nameMap.entries()).map(([key, displayName]) => {
            const amounts = companies.map(company => {
                const list = partnerConfigs[company.cnpj] || []
                const match = list.find(p => (p.name || '').trim().toLowerCase() === key)
                const pct = match?.percentage || 0
                const amount = (company.distribution * pct) / 100
                return { cnpj: company.cnpj, amount, percentage: pct }
            })
            const total = amounts.reduce((sum, a) => sum + a.amount, 0)
            return { key, name: displayName, amounts, total }
        })

        partners.sort((a, b) => b.total - a.total)

        return { companies, partners }
    }, [unifiedViews, activeCnpj, partnerConfigs, perCompanyDistribution])

    const partnerDistribution = useMemo(
        () =>
            currentPartners.map(p => ({
                ...p,
                amount: (totalDistribution * (p.percentage || 0)) / 100
            })),
        [currentPartners, totalDistribution]
    )

    const reportPartnersData = useMemo(() => {
        if (isUnifiedView && unifiedPartnersSummary) {
            const totalAmount = unifiedPartnersSummary.partners.reduce((sum, p) => sum + p.total, 0)
            const partners = unifiedPartnersSummary.partners.map(p => ({
                name: p.name,
                amount: p.total,
                percentage: totalAmount > 0 ? (p.total / totalAmount) * 100 : 0
            }))
            return { partners, totalAmount }
        }
        
        // Single View
        const totalAmount = totalDistribution
        const partners = currentPartners.map(p => ({
            name: p.name,
            percentage: p.percentage,
            amount: (totalAmount * (p.percentage || 0)) / 100
        }))
        return { partners, totalAmount }
    }, [isUnifiedView, unifiedPartnersSummary, currentPartners, totalDistribution])

    const addPartner = () => {
        const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`
        const next: PartnerConfig = { id, name: '', percentage: 0 }
        setPartnerConfigs(prev => ({
            ...prev,
            [currentViewKey]: [...(prev[currentViewKey] || []), next]
        }))
    }

    const updatePartner = (id: string, field: 'name' | 'percentage', value: string) => {
        setPartnerConfigs(prev => {
            const list = prev[currentViewKey] || []
            const nextList = list.map(p => {
                if (p.id !== id) return p
                if (field === 'name') return { ...p, name: value }
                const num = Number(value.replace(',', '.'))
                return { ...p, percentage: isNaN(num) ? 0 : num }
            })
            return { ...prev, [currentViewKey]: nextList }
        })
    }

    const removePartner = (id: string) => {
        setPartnerConfigs(prev => {
            const list = prev[currentViewKey] || []
            const nextList = list.filter(p => p.id !== id)
            return { ...prev, [currentViewKey]: nextList }
        })
    }

    const monthlyTaxesBreakdown = useMemo(() => {
        return sortedFiles.map((file, index) => {
            const dados = file.data as any
            
            // Use explicit tax breakdown from parser
            // Note: tributosIndustriaInterno/Externo were added to das-parse.ts
            const tMerc = (dados.tributosMercadoriasInterno?.Total || 0) + (dados.tributosMercadoriasExterno?.Total || 0)
            const tInd = (dados.tributosIndustriaInterno?.Total || 0) + (dados.tributosIndustriaExterno?.Total || 0)
            const tServ = (dados.tributosServicosInterno?.Total || 0) + (dados.tributosServicosExterno?.Total || 0)
            
            if (tMerc + tInd + tServ > 0.01) {
                 return {
                    servicos: tServ,
                    mercadorias: tMerc,
                    industria: tInd
                 }
            }

            // Fallback using total tax and revenue ratio if detailed breakdown is missing
            // This ensures we show something even if the parser categorization failed but total tax exists
            let servicos = 0
            let mercadorias = 0
            let industria = 0
            
            const parseNumber = (v: any): number => {
                if (typeof v === 'number') return v
                const n = Number(String(v || '').replace(/\./g, '').replace(',', '.'))
                return isFinite(n) ? n : 0
            }

            const totalTax = parseNumber(dados.valorTotalDAS || dados.tributos?.Total || 0)
            const breakdown = monthlyRevenueBreakdown[index]
            const totalRev = breakdown.mercadorias + breakdown.servicos + breakdown.industria
            
            if (totalTax > 0) {
                if (totalRev > 0) {
                    mercadorias = totalTax * (breakdown.mercadorias / totalRev)
                    servicos = totalTax * (breakdown.servicos / totalRev)
                    industria = totalTax * (breakdown.industria / totalRev)
                } else {
                    // Default fallback if no revenue info
                    servicos = totalTax
                }
            }

            return {
                servicos,
                mercadorias,
                industria
            }
        })
    }, [sortedFiles, monthlyRevenueBreakdown])

    const taxesBreakdown = useMemo(() => {
        return monthlyTaxesBreakdown.reduce((acc, curr) => {
            return {
                servicos: acc.servicos + curr.servicos,
                mercadorias: acc.mercadorias + curr.mercadorias,
                industrializacao: acc.industrializacao + curr.industria
            }
        }, { servicos: 0, mercadorias: 0, industrializacao: 0 })
    }, [monthlyTaxesBreakdown])

    const revenueBreakdown = useMemo(() => {
        return monthlyRevenueBreakdown.reduce((acc, curr) => {
            return {
                servicos: acc.servicos + curr.servicos,
                mercadorias: acc.mercadorias + curr.mercadorias,
                industrializacao: acc.industrializacao + curr.industria
            }
        }, { servicos: 0, mercadorias: 0, industrializacao: 0 })
    }, [monthlyRevenueBreakdown])

    const detailedAnalysis = useMemo(() => {
        const sortedYears = [...years].sort((a, b) => b - a)
        
        const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
        const formatPercent = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2 }).format(val / 100)

        const calcVar = (curr: number, prev: number) => {
            const abs = curr - prev
            const pct = prev !== 0 ? (abs / prev) * 100 : 0
            return {
                abs: formatCurrency(abs),
                pct: formatPercent(pct),
                isPositive: abs > 0,
                isNeutral: abs === 0,
                rawPct: pct
            }
        }

        // Annual
        const annual = sortedYears.map((year, i) => {
            if (i === sortedYears.length - 1) return null 
            const prevYear = year - 1
            if (!years.includes(prevYear)) return null

            const currVal = allComparisonData.annual.datasets[0].data[years.indexOf(year)] || 0
            const prevVal = allComparisonData.annual.datasets[0].data[years.indexOf(prevYear)] || 0

            return {
                period: `${year} vs ${prevYear}`,
                currentLabel: `${year}`,
                prevLabel: `${prevYear}`,
                current: formatCurrency(currVal),
                previous: formatCurrency(prevVal),
                ...calcVar(currVal, prevVal)
            }
        }).filter(Boolean)

        // Quarterly
       const quarterly = [1, 2, 3, 4].map(q => {
            const comparisons = sortedYears.map(year => {
                const prevYear = year - 1
                if (!years.includes(prevYear)) return null

                const currDataset = allComparisonData.quarterly.datasets.find((d: any) => d.label === String(year))
                const prevDataset = allComparisonData.quarterly.datasets.find((d: any) => d.label === String(prevYear))
                
                const currVal = currDataset?.data[q - 1] || 0
                const prevVal = prevDataset?.data[q - 1] || 0

                if (currVal === 0) return null

                return {
                    currentLabel: `${year}`,
                    prevLabel: `${prevYear}`,
                    current: formatCurrency(currVal),
                    previous: formatCurrency(prevVal),
                    ...calcVar(currVal, prevVal)
                }
            }).filter(Boolean)

            if (comparisons.length === 0) return null

            return {
                periodName: `${q}º Trimestre`,
                comparisons
            }
       }).filter(Boolean)

       // Semiannual
       const semiannual = [1, 2].map(sem => {
            const comparisons = sortedYears.map(year => {
                const prevYear = year - 1
                if (!years.includes(prevYear)) return null

                const currDataset = allComparisonData.semiannual.datasets.find((d: any) => d.label === String(year))
                const prevDataset = allComparisonData.semiannual.datasets.find((d: any) => d.label === String(prevYear))
                
                const currVal = currDataset?.data[sem - 1] || 0
                const prevVal = prevDataset?.data[sem - 1] || 0

                if (currVal === 0) return null

                return {
                    currentLabel: `${year}`,
                    prevLabel: `${prevYear}`,
                    current: formatCurrency(currVal),
                    previous: formatCurrency(prevVal),
                    ...calcVar(currVal, prevVal)
                }
            }).filter(Boolean)

            if (comparisons.length === 0) return null

            return {
                periodName: `${sem}º Semestre`,
                comparisons
            }
       }).filter(Boolean)

        return { annual, semiannual, quarterly }
    }, [years, allComparisonData])

    const barChartData = useMemo(() => {
        const labels = []
        const data = []
        const colors = []

        if (revenueBreakdown.mercadorias > 0) {
            labels.push('Mercadorias')
            data.push(revenueBreakdown.mercadorias)
            colors.push('#007AFF') // Azul elétrico vibrante
        }
        if (revenueBreakdown.servicos > 0) {
            labels.push('Serviços')
            data.push(revenueBreakdown.servicos)
            colors.push('#3D5AFE') // Índigo elétrico
        }
        if (revenueBreakdown.industrializacao > 0) {
            labels.push('Indústria')
            data.push(revenueBreakdown.industrializacao)
            colors.push('#00C2FF') // Ciano vibrante
        }

        // Fallback if empty (shouldn't happen if there is revenue)
        if (labels.length === 0 && totalRevenue > 0) {
            labels.push('Total')
            data.push(totalRevenue)
            colors.push('#3D5AFE') // Índigo elétrico
        }

        return {
            labels,
            datasets: [{
                label: 'Receita Total',
                data,
                backgroundColor: colors,
                borderRadius: 4,
                barThickness: 40,
            }]
        }
    }, [revenueBreakdown, totalRevenue])

    const hasMultipleSources = useMemo(() => {
        const sources = [
            revenueBreakdown.mercadorias > 0,
            revenueBreakdown.servicos > 0,
            revenueBreakdown.industrializacao > 0
        ]
        return sources.filter(Boolean).length > 1
    }, [revenueBreakdown])

    const stackedBarChartData = useMemo(() => {
        const labels = monthlyRevenueBreakdown.map(d => {
            const parts = d.month.split('/')
            // Remove day if present (01/06/2024 -> 06/2024). Ideally map to MonthName/Year
            if (parts.length === 3) return `${parts[1]}/${parts[2]}`
            return d.month
        })

        const totalMercadorias = monthlyRevenueBreakdown.reduce((acc, d) => acc + d.mercadorias, 0)
        const totalIndustria = monthlyRevenueBreakdown.reduce((acc, d) => acc + d.industria, 0)
        const totalServicos = monthlyRevenueBreakdown.reduce((acc, d) => acc + d.servicos, 0)

        const datasets = []

        const common = {
            barPercentage: 0.4,
            categoryPercentage: 0.7,
            maxBarThickness: 40,
        }

        if (totalMercadorias > 0) {
            datasets.push({
                label: 'Mercadorias',
                data: monthlyRevenueBreakdown.map(d => d.mercadorias),
                backgroundColor: '#007AFF', // Azul elétrico vibrante
                hoverBackgroundColor: '#0056B3',
                ...common
            })
        }

        if (totalIndustria > 0) {
            datasets.push({
                label: 'Indústria',
                data: monthlyRevenueBreakdown.map(d => d.industria),
                backgroundColor: '#00C2FF', // Ciano vibrante
                hoverBackgroundColor: '#009ACD',
                ...common
            })
        }

        if (totalServicos > 0) {
            datasets.push({
                label: 'Serviços',
                data: monthlyRevenueBreakdown.map(d => d.servicos),
                backgroundColor: '#3D5AFE', // Índigo elétrico
                hoverBackgroundColor: '#304FFE',
                ...common
            })
        }

        return {
            labels,
            datasets
        }
    }, [monthlyRevenueBreakdown])

    const handleExportExcel = async () => {
        const companyName = sortedFiles[0]?.data.identificacao.razaoSocial || activeCnpj || 'Empresa'
        
        // Group files by year
        const filesByYear: Record<string, number[]> = {}
        sortedFiles.forEach((file, index) => {
            const year = file.data.identificacao.periodoApuracao.match(/\d{4}/)?.[0] || 'Unknown'
            if (!filesByYear[year]) filesByYear[year] = []
            filesByYear[year].push(index)
        })
        const years = Object.keys(filesByYear).sort()

        // Fix Period Label logic
        const startFile = sortedFiles[0]
        const endFile = sortedFiles[sortedFiles.length - 1]
        const startLabel = startFile ? formatPeriod(startFile.data.identificacao.periodoApuracao) : ''
        const endLabel = endFile ? formatPeriod(endFile.data.identificacao.periodoApuracao) : ''
        const periodLabel = startLabel === endLabel ? startLabel : `${startLabel} a ${endLabel}`

        // Create Workbook
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Distribuição de Resultados')

        // Fetch and Add Logo
        try {
            const response = await fetch('/shared/integra-logo.png')
            if (response.ok) {
                const buffer = await response.arrayBuffer()
                const logoId = workbook.addImage({
                    buffer: buffer,
                    extension: 'png',
                })
                worksheet.addImage(logoId, {
                    tl: { col: 0, row: 0 },
                    ext: { width: 180, height: 60 }
                })
            }
        } catch (e) {
            console.error("Failed to add logo", e)
        }

        // Set Columns
        worksheet.columns = [
            { width: 25 }, // Período
            { width: 20 }, // Rec Merc
            { width: 20 }, // Rec Serv
            { width: 18 }, // IRPJ Merc
            { width: 18 }, // IRPJ Serv
            { width: 12 }, // Aliq Merc
            { width: 12 }, // Aliq Serv
            { width: 20 }, // Dist Merc
            { width: 20 }, // Dist Serv
            { width: 20 }, // Total Dist
        ]

        // Header Info
        worksheet.getCell('B2').value = companyName
        worksheet.getCell('B2').font = { size: 16, bold: true, color: { argb: 'FF000000' } }
        
        worksheet.getCell('B3').value = `Período: ${periodLabel}`
        worksheet.getCell('B3').font = { size: 12, color: { argb: 'FF555555' } }

        // Table Headers
        const headerRowIndex = 6
        const headerRow = worksheet.getRow(headerRowIndex)
        headerRow.values = ["Período", "Receita Bruta", "", "IRPJ", "", "Alíquota", "", "Distribuição", "", "Total"]
        headerRow.height = 30
        
        const subHeaderRow = worksheet.getRow(headerRowIndex + 1)
        subHeaderRow.values = ["", "Mercadorias", "Serviços", "Mercadorias", "Serviços", "Mercadorias", "Serviços", "Mercadorias", "Serviços", ""]
        subHeaderRow.height = 25

        // Style Headers
        const headerFill: ExcelJS.Fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF007AFF' }
        }
        const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
        const headerBorder: Partial<ExcelJS.Borders> = {
            top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
            left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
            bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
            right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
        }

        for (let r = headerRowIndex; r <= headerRowIndex + 1; r++) {
            for (let c = 1; c <= 10; c++) {
                const cell = worksheet.getCell(r, c)
                cell.fill = headerFill
                cell.font = headerFont
                cell.alignment = { horizontal: 'center', vertical: 'middle' }
                cell.border = headerBorder as ExcelJS.Borders
            }
        }

        // Merge Headers
        worksheet.mergeCells(`A${headerRowIndex}:A${headerRowIndex+1}`)
        worksheet.mergeCells(`B${headerRowIndex}:C${headerRowIndex}`)
        worksheet.mergeCells(`D${headerRowIndex}:E${headerRowIndex}`)
        worksheet.mergeCells(`F${headerRowIndex}:G${headerRowIndex}`)
        worksheet.mergeCells(`H${headerRowIndex}:I${headerRowIndex}`)
        worksheet.mergeCells(`J${headerRowIndex}:J${headerRowIndex+1}`)

        // Pre-calculate totals
        const grandTotal = { recMerc: 0, recServ: 0, irpjMerc: 0, irpjServ: 0, distMerc: 0, distServ: 0 }
        const totalsByYear: Record<string, typeof grandTotal> = {}

        years.forEach(year => {
            totalsByYear[year] = { recMerc: 0, recServ: 0, irpjMerc: 0, irpjServ: 0, distMerc: 0, distServ: 0 }
            const indices = filesByYear[year]
            
            indices.forEach(index => {
                const file = sortedFiles[index]
                const breakdown = monthlyRevenueBreakdown[index]
                const irpjTotal = file.data.tributos?.IRPJ || 0
                
                const baseMerc = breakdown.mercadorias * 0.08
                const baseServ = breakdown.servicos * 0.32
                const totalBase = baseMerc + baseServ
                const irpjMerc = totalBase > 0 ? (irpjTotal * (baseMerc / totalBase)) : 0
                const irpjServ = totalBase > 0 ? (irpjTotal * (baseServ / totalBase)) : 0
                const distMerc = baseMerc - irpjMerc
                const distServ = baseServ - irpjServ

                totalsByYear[year].recMerc += breakdown.mercadorias
                totalsByYear[year].recServ += breakdown.servicos
                totalsByYear[year].irpjMerc += irpjMerc
                totalsByYear[year].irpjServ += irpjServ
                totalsByYear[year].distMerc += distMerc
                totalsByYear[year].distServ += distServ

                grandTotal.recMerc += breakdown.mercadorias
                grandTotal.recServ += breakdown.servicos
                grandTotal.irpjMerc += irpjMerc
                grandTotal.irpjServ += irpjServ
                grandTotal.distMerc += distMerc
                grandTotal.distServ += distServ
            })
        })

        // Add Data Rows
        let currentRowIndex = headerRowIndex + 2
        
        years.forEach(year => {
            const indices = filesByYear[year]
            indices.forEach(index => {
                const file = sortedFiles[index]
                const breakdown = monthlyRevenueBreakdown[index]
                const irpjTotal = file.data.tributos?.IRPJ || 0
                const rawPeriod = file.data.identificacao.periodoApuracao
                const periodoDisplay = formatPeriod(rawPeriod)

                const baseMerc = breakdown.mercadorias * 0.08
                const baseServ = breakdown.servicos * 0.32
                const totalBase = baseMerc + baseServ
                const irpjMerc = totalBase > 0 ? (irpjTotal * (baseMerc / totalBase)) : 0
                const irpjServ = totalBase > 0 ? (irpjTotal * (baseServ / totalBase)) : 0
                const distMerc = baseMerc - irpjMerc
                const distServ = baseServ - irpjServ

                const row = worksheet.getRow(currentRowIndex)
                row.values = [
                    periodoDisplay,
                    breakdown.mercadorias,
                    breakdown.servicos,
                    irpjMerc,
                    irpjServ,
                    0.08,
                    0.32,
                    distMerc,
                    distServ,
                    distMerc + distServ
                ]

                // Apply formats
                row.getCell(2).numFmt = '"R$ "#,##0.00'
                row.getCell(3).numFmt = '"R$ "#,##0.00'
                row.getCell(4).numFmt = '"R$ "#,##0.00'
                row.getCell(5).numFmt = '"R$ "#,##0.00'
                row.getCell(6).numFmt = '0%'
                row.getCell(7).numFmt = '0%'
                row.getCell(8).numFmt = '"R$ "#,##0.00'
                row.getCell(9).numFmt = '"R$ "#,##0.00'
                row.getCell(10).numFmt = '"R$ "#,##0.00'
                
                // Zebra Striping
                if (currentRowIndex % 2 !== 0) {
                    for(let c=1; c<=10; c++) {
                        row.getCell(c).fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFF5F5F5' }
                        }
                    }
                }
                
                row.alignment = { vertical: 'middle' }
                row.getCell(1).alignment = { horizontal: 'left' } // Period
                
                currentRowIndex++
            })
        })

        currentRowIndex++ // Spacer

        // Year Totals
        years.forEach(year => {
            const yearTotals = totalsByYear[year]
            const row = worksheet.getRow(currentRowIndex)
            row.values = [
                `TOTAL ${year}`,
                yearTotals.recMerc,
                yearTotals.recServ,
                yearTotals.irpjMerc,
                yearTotals.irpjServ,
                null,
                null,
                yearTotals.distMerc,
                yearTotals.distServ,
                yearTotals.distMerc + yearTotals.distServ
            ]
            
            row.font = { bold: true }
            row.getCell(2).numFmt = '"R$ "#,##0.00'
            row.getCell(3).numFmt = '"R$ "#,##0.00'
            row.getCell(4).numFmt = '"R$ "#,##0.00'
            row.getCell(5).numFmt = '"R$ "#,##0.00'
            row.getCell(8).numFmt = '"R$ "#,##0.00'
            row.getCell(9).numFmt = '"R$ "#,##0.00'
            row.getCell(10).numFmt = '"R$ "#,##0.00'
            
            // Light Blue Background for Totals
            for(let c=1; c<=10; c++) {
                row.getCell(c).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE6F2FF' }
                }
                row.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'thin' } }
            }

            currentRowIndex++
        })

        currentRowIndex++ // Spacer

        // Grand Total
        const grandRow = worksheet.getRow(currentRowIndex)
        grandRow.values = [
            "TOTAL GERAL",
            grandTotal.recMerc,
            grandTotal.recServ,
            grandTotal.irpjMerc,
            grandTotal.irpjServ,
            null,
            null,
            grandTotal.distMerc,
            grandTotal.distServ,
            grandTotal.distMerc + grandTotal.distServ
        ]
        
        grandRow.font = { bold: true, size: 12 }
        grandRow.getCell(2).numFmt = '"R$ "#,##0.00'
        grandRow.getCell(3).numFmt = '"R$ "#,##0.00'
        grandRow.getCell(4).numFmt = '"R$ "#,##0.00'
        grandRow.getCell(5).numFmt = '"R$ "#,##0.00'
        grandRow.getCell(8).numFmt = '"R$ "#,##0.00'
        grandRow.getCell(9).numFmt = '"R$ "#,##0.00'
        grandRow.getCell(10).numFmt = '"R$ "#,##0.00'

        // Highlight Grand Total
        for(let c=1; c<=10; c++) {
            grandRow.getCell(c).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFCCE5FF' }
            }
            grandRow.getCell(c).border = { top: { style: 'medium' }, bottom: { style: 'medium' } }
        }

        // Save
        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        saveAs(blob, `distribuicao_resultados_${companyName.replace(/\s+/g, '_')}.xlsx`)
    }

    // Navigation Logic
    const hasNext = selectedFileIndex !== null && selectedFileIndex < sortedFiles.length - 1
    const hasPrev = selectedFileIndex !== null && selectedFileIndex > 0

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (selectedFileIndex === null) return
            
            if (e.key === 'ArrowLeft' && hasPrev) {
                setSelectedFileIndex(selectedFileIndex - 1)
            } else if (e.key === 'ArrowRight' && hasNext) {
                setSelectedFileIndex(selectedFileIndex + 1)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selectedFileIndex, hasNext, hasPrev])

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-background">

            {/* Main Content Area */}
            <div className="flex-1 order-2 lg:order-1 min-w-0 flex flex-col">
                {!isPdfGen && (
                    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b flex items-center overflow-x-auto px-4 py-2 gap-2 w-full no-scrollbar">
                        {/* Tabs por Empresa */}
                        {uniqueCnpjs.map((cnpj) => {
                            const companyFiles = localFiles.filter(f => f.data.identificacao.cnpj === cnpj);
                            const companyName = companyFiles[0]?.data.identificacao.razaoSocial || cnpj;
                            const isActive = activeCnpj === cnpj;

                            return (
                                <Button
                                    key={cnpj}
                                    variant={isActive ? "secondary" : "ghost"}
                                    size="sm"
                                    className={cn("shrink-0 gap-2", isActive && "font-bold")}
                                    onClick={() => {
                                        setActiveCnpj(cnpj);
                                        const lastView = viewHistory[cnpj] ?? null
                                        setTargetFilename(lastView);
                                    }}
                                >
                                    <Building2 className="w-4 h-4" />
                                    {companyName.length > 30 ? companyName.substring(0, 30) + '...' : companyName}
                                </Button>
                            )
                        })}
                        
                        {/* Tab Consolidado (Gerado após unificação) */}
                        {unifiedViews.map((view) => (
                            <div key={view.id} className="relative group">
                                <Button
                                    variant={activeCnpj === view.id ? "secondary" : "ghost"}
                                    size="sm"
                                    className={cn("shrink-0 gap-2 pr-8 text-left items-start", activeCnpj === view.id && "font-bold")}
                                    onClick={() => {
                                        setActiveCnpj(view.id)
                                        const lastView = viewHistory[view.id] ?? null
                                        setTargetFilename(lastView)
                                    }}
                                >
                                    <Grid className="w-4 h-4 mt-0.5" />
                                    <span className="flex flex-col text-xs whitespace-pre-line leading-tight">
                                        {view.label}
                                        <span className="text-[10px] text-muted-foreground mt-0.5">
                                            ({view.cnpjs.length} empresas)
                                        </span>
                                    </span>
                                </Button>
                                <button
                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setUnifiedViews(prev => prev.filter(v => v.id !== view.id))
                                        if (activeCnpj === view.id) {
                                            setActiveCnpj(localFiles[0]?.data.identificacao.cnpj)
                                        }
                                    }}
                                    title="Remover visão unificada"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className={`relative flex-1 ${isPdfGen ? 'max-w-none' : ''}`}>
                    {/* Modal de Arquivos Inválidos */}
                    {showInvalidFilesModal && invalidFiles && invalidFiles.length > 0 && !isPdfGen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                            <Card className="w-full max-w-lg shadow-2xl border-destructive/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                                <CardHeader className="bg-destructive/10 border-b border-destructive/10 pb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-destructive/20 rounded-full">
                                                <AlertTriangle className="w-5 h-5 text-destructive" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-destructive text-lg font-bold">Atenção: Arquivos Não Processados</CardTitle>
                                            </div>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-destructive hover:bg-destructive/20 hover:text-destructive rounded-full" 
                                            onClick={() => setShowInvalidFilesModal(false)}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6 max-h-[60vh] overflow-y-auto">
                                    <AlertDescription className="text-sm text-muted-foreground mb-4 leading-relaxed">
                                        Os arquivos listados abaixo não possuem <strong>CNPJ</strong> ou <strong>Período de Apuração</strong> válidos e foram removidos automaticamente para garantir a integridade do dashboard.
                                    </AlertDescription>
                                    <div className="space-y-2 mb-6">
                                        {invalidFiles.map((file, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 bg-muted/40 hover:bg-muted/60 transition-colors rounded-lg border border-border group">
                                                <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 group-hover:bg-destructive/20 transition-colors">
                                                    <FileText className="w-4 h-4 text-destructive" />
                                                </div>
                                                <span className="text-sm font-medium truncate flex-1 select-all" title={file}>
                                                    {file}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-end pt-2 border-t border-border">
                                        <Button 
                                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-sm" 
                                            onClick={() => setShowInvalidFilesModal(false)}
                                        >
                                            Entendi, fechar aviso
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Modal de Seleção para PDF */}
                    {showPdfSelectionModal && !isPdfGen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                            <Card className="w-full max-w-lg shadow-2xl border-border/50 bg-background/95 backdrop-blur">
                                <CardHeader className="border-b pb-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg font-bold">Selecionar Períodos para Relatório</CardTitle>
                                        <Button variant="ghost" size="icon" onClick={() => setShowPdfSelectionModal(false)}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Escolha quais meses deseja incluir no PDF gerado.
                                    </p>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="flex justify-end mb-2">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-xs h-7"
                                            onClick={() => {
                                                const relevantFiles = localFiles.filter(f => f.data.identificacao.cnpj === activeCnpj)
                                                if (pdfSelectedPeriodIds.size === relevantFiles.length) {
                                                    setPdfSelectedPeriodIds(new Set())
                                                } else {
                                                    setPdfSelectedPeriodIds(new Set(relevantFiles.map(f => f.data.identificacao.periodoApuracao)))
                                                }
                                            }}
                                        >
                                            {pdfSelectedPeriodIds.size === localFiles.filter(f => f.data.identificacao.cnpj === activeCnpj).length ? "Desmarcar Todos" : "Selecionar Todos"}
                                        </Button>
                                    </div>
                                    <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-2">
                                        {[...sortedFiles]
                                            .sort((a, b) => {
                                                // Sort by period
                                                const getVal = (d: string) => {
                                                    const parts = d.split('/')
                                                    if (parts.length === 2) return parseInt(parts[1]) * 100 + parseInt(parts[0])
                                                    if (parts.length === 3) return parseInt(parts[2]) * 100 + parseInt(parts[1])
                                                    return 0
                                                }
                                                return getVal(b.data.identificacao.periodoApuracao) - getVal(a.data.identificacao.periodoApuracao)
                                            })
                                            .map((file, i) => {
                                                const period = file.data.identificacao.periodoApuracao
                                                const isSelected = pdfSelectedPeriodIds.has(period)
                                                return (
                                                    <div 
                                                        key={i} 
                                                        className={cn(
                                                            "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                                                            isSelected ? "bg-primary/5 border-primary/30" : "bg-card border-border hover:bg-muted/50"
                                                        )}
                                                        onClick={() => {
                                                            setPdfSelectedPeriodIds(prev => {
                                                                const next = new Set(prev)
                                                                if (next.has(period)) next.delete(period)
                                                                else next.add(period)
                                                                return next
                                                            })
                                                        }}
                                                    >
                                                        <div className={cn(
                                                            "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                                            isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                                                        )}>
                                                            {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-medium text-sm capitalize">{formatPeriod(period)}</span>
                                                                <span className="text-xs text-muted-foreground font-mono">
                                                                    {file.data.receitas.receitaPA.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                    </div>
                                    <div className="flex justify-end gap-3 pt-6">
                                        <Button variant="outline" onClick={() => setShowPdfSelectionModal(false)}>
                                            Cancelar
                                        </Button>
                                        <Button 
                                            className="bg-[#007AFF] hover:bg-[#005bb5] text-white"
                                            disabled={pdfSelectedPeriodIds.size === 0}
                                            onClick={() => {
                                                setShowPdfSelectionModal(false)
                                                handleExportPdf(pdfSelectedPeriodIds)
                                            }}
                                        >
                                            Gerar PDF ({pdfSelectedPeriodIds.size})
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Modal de Unificação de Empresas */}
                    {showUnifyModal && !isPdfGen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                            <Card className="w-full max-w-lg shadow-2xl border-border/50 bg-background/95 backdrop-blur">
                                <CardHeader className="border-b pb-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg font-bold">Unificar Resultados</CardTitle>
                                        <Button variant="ghost" size="icon" onClick={() => setShowUnifyModal(false)}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Selecione as empresas que deseja consolidar em uma única visualização.
                                    </p>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                                        {uniqueCompanies.map(({ cnpj, name }) => (
                                            <div 
                                                key={cnpj} 
                                                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                                                onClick={() => {
                                                    const next = new Set(selectedUnifyCnpjs)
                                                    if (next.has(cnpj)) next.delete(cnpj)
                                                    else next.add(cnpj)
                                                    setSelectedUnifyCnpjs(next)
                                                }}
                                            >
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedUnifyCnpjs.has(cnpj) ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                                                    {selectedUnifyCnpjs.has(cnpj) && <CheckCircle className="w-3.5 h-3.5" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">{name}</p>
                                                    <p className="text-xs text-muted-foreground">{cnpj}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-end pt-4 border-t mt-4 gap-2">
                                        <Button variant="ghost" onClick={() => setShowUnifyModal(false)}>
                                            Cancelar
                                        </Button>
                                        <Button 
                                            onClick={() => {
                                                if (selectedUnifyCnpjs.size > 0) {
                                                    const newId = `UNIFIED_${Date.now()}`
                                                    const selectedArray = Array.from(selectedUnifyCnpjs)
                                                    const summarizeName = (full?: string | null) => {
                                                        if (!full) return ''
                                                        let n = full.trim()
                                                        n = n.replace(/\b(LTDA|LTD\.?|ME|EPP|S\/A|SA)\b\.?/gi, '').trim()
                                                        if (n.length > 24) n = n.slice(0, 21).trimEnd() + '...'
                                                        return n
                                                    }
                                                    const companyNames = selectedArray
                                                        .map(cnpj => {
                                                            const f = localFiles.find(file => file.data.identificacao.cnpj === cnpj)
                                                            return summarizeName(f?.data.identificacao.razaoSocial)
                                                        })
                                                        .filter(Boolean) as string[]
                                                    const label = companyNames.length > 0 
                                                        ? companyNames.join('\n') 
                                                        : `Consolidado ${unifiedViews.length + 1}`
                                                    const newView: UnifiedView = {
                                                        id: newId,
                                                        label,
                                                        cnpjs: selectedArray
                                                    }
                                                    setUnifiedViews(prev => [...prev, newView])
                                                    setActiveCnpj(newId)
                                                    setSelectedFileIndex(null)
                                                    setTargetFilename(null)
                                                    setShowUnifyModal(false)
                                                    setSelectedUnifyCnpjs(new Set())
                                                }
                                            }}
                                            disabled={selectedUnifyCnpjs.size === 0}
                                        >
                                            Confirmar Unificação ({selectedUnifyCnpjs.size})
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Common Actions (Visible on both Consolidated and Single File views) */}
                    {!isPdfGen && (
                        <div className="flex justify-end mb-6 px-6 pt-4 mx-6 mt-4">
                            <DashboardActions 
                                onUpload={handleFileUpload} 
                                isUploading={isUploading} 
                                onExportPdf={openPdfSelection}
                                isSaving={isSaving}
                                onDownloadSingle={currentFile ? () => handleSingleFileDownload(currentFile) : undefined}
                                onDownloadConsolidated={isConsolidated ? handleConsolidatedDownload : undefined}
                                onUnify={isMultiCompany ? () => setShowUnifyModal(true) : undefined}
                                hideExportButton={isEmbedded}
                                hideUploadButton={isEmbedded}
                            />
                        </div>
                    )}

                    {(isConsolidated || isPdfGen) && (
                        <>

                            {/* Report Cover (Resumo Geral) */}
                            {((activeTab === 'resumo' && !isPdfGen) || isPdfGen) && sortedFiles.length > 0 && (
                                <div
                                    ref={resumoRef}
                                    className={isPdfGen ? 'origin-top' : undefined}
                                    style={
                                        isPdfGen
                                            ? {
                                                width: '1600px',
                                                pageBreakAfter: 'always',
                                                margin: '0 auto',
                                                ['zoom' as any]: resumoZoom ?? 1,
                                            }
                                            : undefined
                                    }
                                >
                                    <ReportCover 
                                        files={sortedFiles}
                                        companyName={sortedFiles[0]?.data.identificacao.razaoSocial || activeCnpj || 'Empresa'}
                                        cnpj={activeCnpj || ''}
                                        isDark={isDark}
                                        isPdfGen={isPdfGen}
                                        unifiedCompanies={headerCompanies}
                                        partnersData={reportPartnersData}
                                    />
                                </div>
                            )}
                            
                            {/* Consolidated Charts (Visão Geral) */}
                            {((activeTab === 'visao-geral' && !isPdfGen) || isPdfGen) && (
                                <div
                                    ref={visaoRef}
                                    className={isPdfGen ? 'p-0 space-y-1 print:p-0 print:space-y-1 origin-top' : 'p-6 space-y-6'}
                                    style={
                                        isPdfGen
                                            ? {
                                                width: '1600px',
                                                pageBreakAfter: 'always',
                                                margin: '0 auto',
                                                ['zoom' as any]: visaoZoom ?? 1,
                                            }
                                            : undefined
                                    }
                                >
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                                        <div>
                                            <h1 className={cn("text-2xl font-bold text-foreground", isPdfGen && "print-title-main text-lg mb-0")}>Visão Geral Anual</h1>
                                            <p className={cn("text-muted-foreground", isPdfGen && "print-text-muted text-[10px]")}>Consolidado de {sortedFiles.length} períodos apurados</p>
                                        </div>
                                    </div>

                                    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", isPdfGen && "gap-1 print:gap-1")}>
                                <Card className={cn("flex flex-col h-full", isPdfGen && "shadow-none")}>
                                    <CardHeader className={cn("pb-2", isPdfGen && "p-2 pb-1")}>
                                        <CardTitle className={cn("text-sm font-medium text-muted-foreground", isPdfGen && "text-[10px]")}>Receita Bruta Total</CardTitle>
                                    </CardHeader>
                                    <CardContent className={cn("flex flex-col justify-between flex-1", isPdfGen && "p-2 pt-0")}>
                                        <div className="flex flex-col gap-1 mb-2">
                                            {revenueBreakdown.servicos > 0 && (
                                                <span className={cn("inline-flex items-center rounded-full bg-[#007AFF]/20 text-[#007AFF] dark:bg-[#007AFF]/40 dark:text-[#FFFFFF] px-2 py-0.5 text-[10px] font-semibold w-fit", isPdfGen && "text-[8px] px-1 py-0")}>
                                                    Serviços: {revenueBreakdown.servicos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                            )}
                                            {revenueBreakdown.mercadorias > 0 && (
                                                <span className={cn("inline-flex items-center rounded-full bg-[#3D5AFE]/20 text-[#3D5AFE] dark:bg-[#3D5AFE]/40 dark:text-[#FFFFFF] px-2 py-0.5 text-[10px] font-semibold w-fit", isPdfGen && "text-[8px] px-1 py-0")}>
                                                    Mercadorias: {revenueBreakdown.mercadorias.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                            )}
                                            {revenueBreakdown.industrializacao > 0 && (
                                                <span className={cn("inline-flex items-center rounded-full bg-[#00C2FF]/20 text-[#00C2FF] dark:bg-[#00C2FF]/40 dark:text-[#FFFFFF] px-2 py-0.5 text-[10px] font-semibold w-fit", isPdfGen && "text-[8px] px-1 py-0")}>
                                                    Indústria: {revenueBreakdown.industrializacao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-row items-baseline gap-2">
                                            <div className={cn("text-lg font-bold text-emerald-600 dark:text-emerald-400", isPdfGen && "text-base")}>
                                                {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </div>
                                            <p className={cn("text-[11px] text-muted-foreground whitespace-nowrap", isPdfGen && "text-[9px]")}>
                                                Média: {averageRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* New Card: Resumo por Ano */}
                                <Card className={cn("flex flex-col h-full", isPdfGen && "shadow-none")}>
                                    <CardHeader className={cn("pb-2", isPdfGen && "p-2 pb-1")}>
                                        <CardTitle className={cn("text-sm font-medium text-muted-foreground", isPdfGen && "text-[10px]")}>Resumo por Ano</CardTitle>
                                    </CardHeader>
                                    <CardContent className={cn("flex flex-col justify-between flex-1", isPdfGen && "p-2 pt-0")}>
                                        <div className="flex flex-col gap-1 mb-2">
                                            {years.map(year => {
                                                const yearData = monthlyDataByYear.get(year)
                                                const yearTotal: number = (yearData?.revenue || []).reduce(
                                                    (sum: number, val) => sum + (val || 0),
                                                    0
                                                )
                                                return (
                                                    <span key={year} className={cn("inline-flex items-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 px-2 py-0.5 text-[10px] font-semibold w-fit", isPdfGen && "text-[8px] px-1 py-0")}>
                                                        {year}: {yearTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </span>
                                                )
                                            })}
                                        </div>
                                        {(() => {
                                            const grandTotalRevenue = years.reduce((acc: number, year) => {
                                                const yearData = monthlyDataByYear.get(year)
                                                const yearTotal: number = (yearData?.revenue || []).reduce(
                                                    (sum: number, val) => sum + (val || 0),
                                                    0
                                                )
                                                return acc + yearTotal
                                            }, 0)
                                            const averagePerYear = years.length > 0 ? grandTotalRevenue / years.length : 0

                                            return (
                                                <div className="flex flex-row items-baseline gap-2">
                                                    <div className={cn("text-lg font-bold text-emerald-600 dark:text-emerald-400", isPdfGen && "text-base")}>
                                                        {grandTotalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </div>
                                                    <p className={cn("text-[11px] text-muted-foreground whitespace-nowrap", isPdfGen && "text-[9px]")}>
                                                        Média: {averagePerYear.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/ano
                                                    </p>
                                                </div>
                                            )
                                        })()}
                                    </CardContent>
                                </Card>

                                <Card className={cn("flex flex-col h-full", isPdfGen && "shadow-none")}>
                                    <CardHeader className={cn("pb-2", isPdfGen && "p-2 pb-1")}>
                                        <CardTitle className={cn("text-sm font-medium text-muted-foreground", isPdfGen && "text-[10px]")}>Total de Impostos</CardTitle>
                                    </CardHeader>
                                    <CardContent className={cn("flex flex-col justify-between flex-1", isPdfGen && "p-2 pt-0")}>
                                        <div className="flex flex-col gap-1 mb-2">
                                            {taxesBreakdown.servicos > 0 && (
                                                <span className={cn("inline-flex items-center rounded-full bg-[#007AFF]/20 text-[#007AFF] dark:bg-[#007AFF]/40 dark:text-[#FFFFFF] px-2 py-0.5 text-[10px] font-semibold w-fit", isPdfGen && "text-[8px] px-1 py-0")}>
                                                    Serviços: {taxesBreakdown.servicos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                            )}
                                            {taxesBreakdown.mercadorias > 0 && (
                                                <span className={cn("inline-flex items-center rounded-full bg-[#3D5AFE]/20 text-[#3D5AFE] dark:bg-[#3D5AFE]/40 dark:text-[#FFFFFF] px-2 py-0.5 text-[10px] font-semibold w-fit", isPdfGen && "text-[8px] px-1 py-0")}>
                                                    Mercadorias: {taxesBreakdown.mercadorias.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                            )}
                                            {taxesBreakdown.industrializacao > 0 && (
                                                <span className={cn("inline-flex items-center rounded-full bg-[#00C2FF]/20 text-[#00C2FF] dark:bg-[#00C2FF]/40 dark:text-[#FFFFFF] px-2 py-0.5 text-[10px] font-semibold w-fit", isPdfGen && "text-[8px] px-1 py-0")}>
                                                    Indústria: {taxesBreakdown.industrializacao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-row items-baseline gap-2">
                                            <div className={cn("text-lg font-bold text-red-600 dark:text-red-400", isPdfGen && "text-base")}>
                                                {totalTaxes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </div>
                                            <p className={cn("text-[11px] text-muted-foreground whitespace-nowrap", isPdfGen && "text-[9px]")}>
                                                Média: {averageTaxes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className={cn("flex flex-col h-full", isPdfGen && "shadow-none")}>
                                    <CardHeader className={cn("pb-2", isPdfGen && "p-2 pb-1")}>
                                        <CardTitle className={cn("text-sm font-medium text-muted-foreground", isPdfGen && "text-[10px]")}>Alíquota Efetiva Média</CardTitle>
                                    </CardHeader>
                                    <CardContent className={cn("flex flex-col justify-between flex-1", isPdfGen && "p-2 pt-0")}>
                                        <div className="flex flex-col gap-1 mb-2">
                                            {revenueBreakdown.servicos > 0 && (
                                                <span className={cn("inline-flex items-center rounded-full bg-[#007AFF]/20 text-[#007AFF] dark:bg-[#007AFF]/40 dark:text-[#FFFFFF] px-2 py-0.5 text-[10px] font-semibold w-fit", isPdfGen && "text-[8px] px-1 py-0")}>
                                                    Serviços: {((taxesBreakdown.servicos / revenueBreakdown.servicos) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}%
                                                </span>
                                            )}
                                            {revenueBreakdown.mercadorias > 0 && (
                                                <span className={cn("inline-flex items-center rounded-full bg-[#3D5AFE]/20 text-[#3D5AFE] dark:bg-[#3D5AFE]/40 dark:text-[#FFFFFF] px-2 py-0.5 text-[10px] font-semibold w-fit", isPdfGen && "text-[8px] px-1 py-0")}>
                                                    Mercadorias: {((taxesBreakdown.mercadorias / revenueBreakdown.mercadorias) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}%
                                                </span>
                                            )}
                                            {revenueBreakdown.industrializacao > 0 && (
                                                <span className={cn("inline-flex items-center rounded-full bg-[#00C2FF]/20 text-[#00C2FF] dark:bg-[#00C2FF]/40 dark:text-[#FFFFFF] px-2 py-0.5 text-[10px] font-semibold w-fit", isPdfGen && "text-[8px] px-1 py-0")}>
                                                    Indústria: {((taxesBreakdown.industrializacao / revenueBreakdown.industrializacao) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}%
                                                </span>
                                            )}
                                        </div>
                                        <div className={cn("text-lg font-bold text-[#93A5AF]", isPdfGen && "text-base")}>
                                            {averageTaxRate.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}%
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className={cn("space-y-6", isPdfGen && "space-y-2 print:space-y-2")}>
                                <Card style={{ breakInside: 'avoid' }} className={cn(isPdfGen && "border-none shadow-none")}>
                                    <CardHeader className={cn("flex flex-row items-center justify-between pb-2", isPdfGen && "p-0 pb-2")}>
                                        <CardTitle className={cn(isPdfGen && "text-sm")}>Evolução Financeira</CardTitle>
                                    </CardHeader>
                                    <CardContent className={cn("p-4 space-y-6", isPdfGen && "p-0 space-y-2")}>
                                        {years.slice(0, isPdfGen ? 3 : years.length).map(year => {
                                            const yearData = monthlyDataByYear.get(year)
                                            const prevYearData = monthlyDataByYear.get(year - 1)

                                            return (
                                                <div key={year} className={cn("h-[420px]", isPdfGen && "h-[260px] print:h-[260px]")}>
                                                    <div className="flex flex-col items-center mb-2">
                                                        <h3 className="text-sm font-semibold text-muted-foreground">Receita e Impostos - {year}</h3>
                                                    </div>
                                                    <Line
                                                        options={{
                                                            ...chartOptions,
                                                            maintainAspectRatio: false,
                                                            layout: {
                                                                padding: {
                                                                    top: isPdfGen ? 5 : 20,
                                                                    right: isPdfGen ? 10 : 20,
                                                                    left: 5,
                                                                    bottom: isPdfGen ? 2 : 5
                                                                }
                                                            },
                                                            plugins: {
                                                                ...chartOptions.plugins,
                                                                datalabels: {
                                                                    display: true,
                                                                    labels: {
                                                                        value: {
                                                                            align: (ctx: any) => ctx.datasetIndex === 1 ? 'bottom' : 'top', // Imposto (1) abaixo, Receita (0) acima
                                                                            anchor: 'center',
                                                                            offset: (ctx: any) => {
                                                                                const base = 12;
                                                                                if (ctx.datasetIndex === 1) return 12; // Imposto: Valor abaixo da linha
                                                                                if (ctx.datasetIndex !== 0) return base; 
                                                                                
                                                                                const chart = ctx.chart;
                                                                                const yAxis = chart.scales.y;
                                                                                if (!yAxis) return base;
                                                                                
                                                                                const idx = ctx.dataIndex;
                                                                                const revVal = ctx.dataset.data[idx];
                                                                                const taxDataset = chart.data.datasets[1];
                                                                                if (!taxDataset) return base;
                                                                                
                                                                                const taxVal = taxDataset.data[idx];
                                                                                if (revVal == null || taxVal == null) return base;
                                                                                
                                                                                const revY = yAxis.getPixelForValue(revVal);
                                                                                const taxY = yAxis.getPixelForValue(taxVal);
                                                                                const dist = taxY - revY;
                                                                                
                                                                                if (dist < 100) return base + (100 - dist); // Aumentado trigger para compensar variação do imposto subindo
                                                                                return base;
                                                                            },
                                                                            color: chartTheme.text,
                                                                            backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)',
                                                                            borderRadius: 4,
                                                                            padding: 2,
                                                                            formatter: (val: any) => {
                                                                                if (val === null || val < 0.01) return '';
                                                                                return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
                                                                            }
                                                                        },
                                                                        variation: {
                                                                            align: 'top', // Todos alinhados acima (Imposto sobe, Receita sobe)
                                                                            anchor: 'center',
                                                                            offset: (ctx: any) => {
                                                                                if (ctx.datasetIndex === 1) return 12; // Imposto: Diferença acima da linha
                                                                                
                                                                                const base = 32; // Receita: acima do valor (Reduzido de 48 para 32 para aproximar)
                                                                                
                                                                                const chart = ctx.chart;
                                                                                const yAxis = chart.scales.y;
                                                                                if (!yAxis) return base;
                                                                                
                                                                                const idx = ctx.dataIndex;
                                                                                const revVal = ctx.dataset.data[idx];
                                                                                const taxDataset = chart.data.datasets[1];
                                                                                if (!taxDataset) return base;
                                                                                
                                                                                const taxVal = taxDataset.data[idx];
                                                                                if (revVal == null || taxVal == null) return base;
                                                                                
                                                                                const revY = yAxis.getPixelForValue(revVal);
                                                                                const taxY = yAxis.getPixelForValue(taxVal);
                                                                                const dist = taxY - revY;
                                                                                
                                                                                if (dist < 100) return base + (100 - dist);
                                                                                return base;
                                                                            },
                                                                            backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)',
                                                                            borderRadius: 4,
                                                                            color: (ctx: any) => {
                                                                                const idx = ctx.dataIndex
                                                                                const curr = ctx.dataset.data[idx] as number
                                                                                let prev = null;
                                                                                
                                                                                if (idx === 0) {
                                                                                     if (ctx.datasetIndex === 0) prev = prevYearData?.revenue?.[11];
                                                                                     else if (ctx.datasetIndex === 1) prev = prevYearData?.taxes?.[11];
                                                                                } else {
                                                                                     prev = ctx.dataset.data[idx - 1] as number;
                                                                                }

                                                                                if (curr === null || prev == null) return 'transparent'
                                                                                return curr >= prev ? '#10B981' : '#EF4444'
                                                                            },
                                                                            font: { weight: 'bold', size: 10 },
                                                                            formatter: (val: any, ctx: any) => {
                                                                                const idx = ctx.dataIndex
                                                                                const curr = ctx.dataset.data[idx] as number
                                                                                let prev = null;

                                                                                if (idx === 0) {
                                                                                     if (ctx.datasetIndex === 0) prev = prevYearData?.revenue?.[11];
                                                                                     else if (ctx.datasetIndex === 1) prev = prevYearData?.taxes?.[11];
                                                                                } else {
                                                                                     prev = ctx.dataset.data[idx - 1] as number;
                                                                                }

                                                                                if (curr === null || prev == null) return ''
                                                                                if (curr < 0.01 || prev < 0.01) return ''
                                                                                
                                                                                const diff = curr - prev
                                                                                const pct = prev !== 0 ? (diff / prev) * 100 : 0
                                                                                const symbol = diff >= 0 ? '▲' : '▼'
                                                                                
                                                                                return `${symbol} ${Math.abs(pct).toFixed(2)}%\n${diff > 0 ? '+' : ''}${diff.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            },
                                                            scales: {
                                                                ...chartOptions.scales,
                                                                y: {
                                                                    ...chartOptions.scales?.y,
                                                                    border: { display: false },
                                                                    grid: {
                                                                        ...chartOptions.scales?.y?.grid
                                                                    }
                                                                },
                                                                x: {
                                                                    ...chartOptions.scales?.x,
                                                                    offset: false,
                                                                    ticks: {
                                                                        padding: 20
                                                                    },
                                                                    grid: {
                                                                        ...chartOptions.scales?.x?.grid,
                                                                        color: (ctx: any) => {
                                                                            if (ctx.index === 0) return 'transparent';
                                                                            return showGrid ? chartTheme.grid : 'transparent';
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }}
                                                        data={{
                                                            labels: yearData?.labels || [],
                                                            datasets: [
                                                                {
                                                                    label: 'Receita Bruta',
                                                                    data: (yearData?.revenue || []).map(v => v === 0 ? null : v),
                                                                    borderColor: '#7c3aed',
                                                                    backgroundColor: 'rgba(124, 58, 237, 0.1)',
                                                                    tension: 0.4,
                                                                    fill: true,
                                                                    pointRadius: 3,
                                                                    pointBackgroundColor: '#7c3aed',
                                                                    pointHoverRadius: 5,
                                                                    spanGaps: true
                                                                },
                                                                ...(yearData?.taxes?.some(v => v !== null && v > 0) ? [{
                                                                    label: 'Impostos',
                                                                    data: (yearData?.taxes || []).map(v => v === 0 ? null : v),
                                                                    borderColor: '#db2777',
                                                                    backgroundColor: 'rgba(219, 39, 119, 0.1)',
                                                                    tension: 0.4,
                                                                    fill: true,
                                                                    pointRadius: 3,
                                                                    pointBackgroundColor: '#db2777',
                                                                    pointHoverRadius: 5,
                                                                    spanGaps: true
                                                                }] : []),
                                                                ...(yearData?.interest?.some(v => v !== null && v > 0) ? [{
                                                                    label: 'Juros/Multa',
                                                                    data: (yearData?.interest || []).map(v => v === 0 ? null : v),
                                                                    borderColor: '#EF4444',
                                                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                                    tension: 0.4,
                                                                    fill: true,
                                                                    pointRadius: 3,
                                                                    pointBackgroundColor: '#EF4444',
                                                                    pointHoverRadius: 5,
                                                                    spanGaps: true
                                                                }] : [])
                                                            ]
                                                        }}
                                                    />
                                                </div>
                                            )
                                        })}
                                    </CardContent>
                                </Card>

                                {/* Chart Visibility Toggles */}
                                <div className="flex justify-end gap-2 mb-2">
                                    {/* Grid Toggle Button */}
                                    <button
                                        onClick={() => setShowGrid(!showGrid)}
                                        className={cn(
                                            "h-6 w-6 rounded-full flex items-center justify-center transition-all bg-muted hover:bg-muted/80",
                                            !showGrid && "opacity-50"
                                        )}
                                        title={showGrid ? "Ocultar grades" : "Mostrar grades"}
                                    >
                                        <Grid className="w-4 h-4 text-muted-foreground" />
                                    </button>

                                    <div className="flex bg-muted rounded-md p-1 gap-1">
                                        <button
                                            onClick={() => setVisibleCharts(prev => ({ ...prev, quarterly: !prev.quarterly }))}
                                            className={cn(
                                                "px-3 py-1 text-xs font-medium rounded-sm transition-all flex items-center gap-2",
                                                visibleCharts.quarterly
                                                    ? "bg-background text-foreground shadow-sm"
                                                    : "text-muted-foreground hover:bg-background/50"
                                            )}
                                        >
                                            {visibleCharts.quarterly && <CheckCircle className="w-3 h-3 text-blue-500" />}
                                            Trimestral
                                        </button>
                                        <button
                                            onClick={() => setVisibleCharts(prev => ({ ...prev, semiannual: !prev.semiannual }))}
                                            className={cn(
                                                "px-3 py-1 text-xs font-medium rounded-sm transition-all flex items-center gap-2",
                                                visibleCharts.semiannual
                                                    ? "bg-background text-foreground shadow-sm"
                                                    : "text-muted-foreground hover:bg-background/50"
                                            )}
                                        >
                                            {visibleCharts.semiannual && <CheckCircle className="w-3 h-3 text-blue-500" />}
                                            Semestral
                                        </button>
                                        <button
                                            onClick={() => setVisibleCharts(prev => ({ ...prev, annual: !prev.annual }))}
                                            className={cn(
                                                "px-3 py-1 text-xs font-medium rounded-sm transition-all flex items-center gap-2",
                                                visibleCharts.annual
                                                    ? "bg-background text-foreground shadow-sm"
                                                    : "text-muted-foreground hover:bg-background/50"
                                            )}
                                        >
                                            {visibleCharts.annual && <CheckCircle className="w-3 h-3 text-blue-500" />}
                                            Anual
                                        </button>
                                    </div>
                                </div>

                                <div className={cn("space-y-6", isPdfGen && "space-y-2 print:space-y-2")}>
                                    {visibleCharts.quarterly && (
                                        <Card style={{ breakInside: 'avoid' }} className={cn(isPdfGen && "border-none shadow-none")}>
                                            <CardHeader className={cn("py-2 px-4", isPdfGen && "p-0 pb-1")}>
                                                <CardTitle className={cn("text-sm font-medium", isPdfGen && "text-xs")}>Comparativo Trimestral</CardTitle>
                                            </CardHeader>
                                            <CardContent className={cn("px-2 pb-2 h-[170px]", isPdfGen && "p-0 h-[150px]")}>
                                                <Bar
                                                    options={chartOptions}
                                                    data={allComparisonData.quarterly}
                                                />
                                            </CardContent>
                                        </Card>
                                    )}

                                    <div className={cn("grid gap-6 grid-cols-1 md:grid-cols-2 print:block print:space-y-6", isPdfGen && "gap-2 print:space-y-2")}>
                                        {visibleCharts.semiannual && (
                                            <Card className={cn(visibleCharts.annual ? "" : "md:col-span-2", isPdfGen && "border-none shadow-none")} style={{ breakInside: 'avoid' }}>
                                                <CardHeader className={cn("py-2 px-4", isPdfGen && "p-0 pb-1")}>
                                                    <CardTitle className={cn("text-sm font-medium", isPdfGen && "text-xs")}>Comparativo Semestral</CardTitle>
                                                </CardHeader>
                                                <CardContent className={cn("px-2 pb-2 h-[180px]", isPdfGen && "p-0 h-[150px]")}>
                                                    <Bar
                                                        options={chartOptions}
                                                        data={allComparisonData.semiannual}
                                                    />
                                                </CardContent>
                                            </Card>
                                        )}

                                        {visibleCharts.annual && (
                                            <Card className={cn(visibleCharts.semiannual ? "" : "md:col-span-2", isPdfGen && "border-none shadow-none")} style={{ breakInside: 'avoid' }}>
                                                <CardHeader className={cn("py-2 px-4", isPdfGen && "p-0 pb-1")}>
                                                    <CardTitle className={cn("text-sm font-medium", isPdfGen && "text-xs")}>Comparativo Anual</CardTitle>
                                                </CardHeader>
                                                <CardContent className={cn("px-2 pb-2 h-[180px]", isPdfGen && "p-0 h-[150px]")}>
                                                    <Bar
                                                        options={chartOptions}
                                                        data={allComparisonData.annual}
                                                    />
                                                </CardContent>
                                            </Card>
                                        )}
                                    </div>
                                </div>

                                {hasMultipleSources && stackedBarChartData && (
                                    <Card style={{ breakInside: 'avoid' }} className={cn(isPdfGen && "border-none shadow-none")}>
                                        <CardHeader className={cn("py-2 px-4", isPdfGen && "p-0 pb-2")}>
                                            <CardTitle className={cn("text-base font-semibold", isPdfGen && "text-sm")}>Composição do Faturamento Mensal</CardTitle>
                                        </CardHeader>
                                        <CardContent className={cn("px-2 pb-2 h-[340px]", isPdfGen && "p-0 h-[220px]")}>
                                            <Bar
                                                options={{
                                                    ...chartOptions,
                                                    layout: {
                                                        padding: {
                                                            top: isPdfGen ? 20 : 50,
                                                            right: isPdfGen ? 10 : 20,
                                                            left: isPdfGen ? 5 : 20,
                                                            bottom: 5
                                                        }
                                                    },
                                                    maintainAspectRatio: false,
                                                    plugins: {
                                                        ...chartOptions.plugins,
                                                        legend: {
                                                            display: true,
                                                            position: 'bottom',
                                                            labels: { color: theme === 'dark' ? '#FFFFFF' : chartTheme.text } // Legenda branca no modo noturno
                                                        },
                                                        datalabels: {
                                                            ...datalabelsConfig,
                                                            align: 'end' as const,
                                                            anchor: 'end' as const,
                                                            rotation: -60,
                                                            offset: 0
                                                        },
                                                        tooltip: {
                                                            ...chartOptions.plugins?.tooltip,
                                                            callbacks: {
                                                                label: function (context: any) {
                                                                    let label = context.dataset.label || '';
                                                                    if (label) {
                                                                        label += ': ';
                                                                    }
                                                                    if (context.parsed.y !== null) {
                                                                        label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                                                                    }
                                                                    return label;
                                                                }
                                                            }
                                                        }
                                                    },
                                                    scales: {
                                                        ...chartOptions.scales,
                                                        x: {
                                                            ...chartOptions.scales?.x,
                                                            stacked: false,
                                                        },
                                                        y: {
                                                            ...chartOptions.scales?.y,
                                                            stacked: false,
                                                            grace: '5%'
                                                        }
                                                    }
                                                }}
                                                data={stackedBarChartData}
                                            />
                                        </CardContent>
                                    </Card>
                                )}
                            </div>


                        </div>
                    )}
                    </>
                )}

                {/* Quadro de Distribuição de Resultados (Dedicated Tab) */}
                    {((isConsolidated && activeTab === 'distribuicao-resultados' && !isPdfGen) || isPdfGen) && (
                    <div
                        ref={distRef}
                        className={isPdfGen ? 'p-2 space-y-2 print:p-0 print:space-y-2 origin-top' : 'p-6 space-y-6'}
                        style={
                            isPdfGen
                                ? {
                                    width: '1600px',
                                    pageBreakAfter: 'always',
                                    margin: '0 auto',
                                    ['zoom' as any]: distZoom ?? 1,
                                }
                                : undefined
                        }
                    >
                         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                            <div>
                                <h1 className={cn("text-2xl font-bold text-foreground", isPdfGen && "print-title-main text-xl mb-1")}>Distribuição de Resultados</h1>
                                <p className={cn("text-muted-foreground", isPdfGen && "print-text-muted text-xs")}>Detalhamento da composição de receitas e distribuição de lucros</p>
                            </div>
                        </div>
                        <Card style={{ breakInside: 'avoid' }}>
                            <CardHeader className="py-2 flex flex-row items-center justify-between">
                                <CardTitle className={cn("text-base font-semibold", isPdfGen && "print-title-section")}>Quadro de Distribuição de Resultados</CardTitle>
                                {!isPdfGen && (
                                    <Button variant="outline" size="sm" className="h-8 gap-2" onClick={handleExportExcel}>
                                        <FileText className="h-4 w-4" />
                                        Exportar Excel
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="pb-2">
                                <Table className={cn(isPdfGen && "print-table")}>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="py-1 h-8 text-[#007AFF] dark:text-[#00C2FF]">Período</TableHead>
                                            <TableHead className="py-1 h-8 text-[#007AFF] dark:text-[#00C2FF]">Receita Bruta</TableHead>
                                            <TableHead className="py-1 h-8 text-[#007AFF] dark:text-[#00C2FF]">IRPJ</TableHead>
                                            <TableHead className="py-1 h-8 text-[#007AFF] dark:text-[#00C2FF]">Alíquota</TableHead>
                                            <TableHead className="py-1 h-8 text-[#007AFF] dark:text-[#00C2FF]">Distribuição</TableHead>
                                            <TableHead className="py-1 h-8 text-[#007AFF] dark:text-[#00C2FF]">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(() => {
                                            const filesByYear: Record<string, Array<{ file: any, index: number }>> = {}
                                            sortedFiles.forEach((file, index) => {
                                                // Extract 4-digit year reliably from "MM/YYYY", "YYYY-MM", or "YYYY/MM"
                                                const year = file.data.identificacao.periodoApuracao.match(/\d{4}/)?.[0] || 'Unknown'
                                                if (!filesByYear[year]) filesByYear[year] = []
                                                filesByYear[year].push({ file, index })
                                            })
                                            
                                            const years = Object.keys(filesByYear).sort()
                                            const grandTotal = {
                                                recMerc: 0, recServ: 0,
                                                irpjMerc: 0, irpjServ: 0,
                                                distMerc: 0, distServ: 0
                                            }
                                            const totalsByYear: Record<string, typeof grandTotal> = {}

                                            // Pre-calculate totals
                                            years.forEach(year => {
                                                totalsByYear[year] = {
                                                    recMerc: 0, recServ: 0,
                                                    irpjMerc: 0, irpjServ: 0,
                                                    distMerc: 0, distServ: 0
                                                }
                                                filesByYear[year].forEach(({ file, index }) => {
                                                    const breakdown = monthlyRevenueBreakdown[index]
                                                    const irpjTotal = file.data.tributos?.IRPJ || 0
                                                    
                                                    // Base Calculations
                                                    const baseMerc = breakdown.mercadorias * 0.08
                                                    const baseServ = breakdown.servicos * 0.32
                                                    const totalBase = baseMerc + baseServ
                                                    const irpjMerc = totalBase > 0 ? (irpjTotal * (baseMerc / totalBase)) : 0
                                                    const irpjServ = totalBase > 0 ? (irpjTotal * (baseServ / totalBase)) : 0
                                                    const distMerc = baseMerc - irpjMerc
                                                    const distServ = baseServ - irpjServ

                                                    // Accumulate Year Totals
                                                    totalsByYear[year].recMerc += breakdown.mercadorias
                                                    totalsByYear[year].recServ += breakdown.servicos
                                                    totalsByYear[year].irpjMerc += irpjMerc
                                                    totalsByYear[year].irpjServ += irpjServ
                                                    totalsByYear[year].distMerc += distMerc
                                                    totalsByYear[year].distServ += distServ

                                                    // Accumulate Grand Total
                                                    grandTotal.recMerc += breakdown.mercadorias
                                                    grandTotal.recServ += breakdown.servicos
                                                    grandTotal.irpjMerc += irpjMerc
                                                    grandTotal.irpjServ += irpjServ
                                                    grandTotal.distMerc += distMerc
                                                    grandTotal.distServ += distServ
                                                })
                                            })

                                            return (
                                                <>
                                                    {/* 1. All Monthly Rows */}
                                                    {years.map(year => {
                                                        const yearFiles = filesByYear[year]
                                                        return (
                                                            <React.Fragment key={year}>
                                                                {yearFiles.map(({ file, index }) => {
                                                                    const breakdown = monthlyRevenueBreakdown[index]
                                                                    const irpjTotal = file.data.tributos?.IRPJ || 0
                                                                    const rawPeriod = file.data.identificacao.periodoApuracao
                                                                    const periodoDisplay = formatPeriod(rawPeriod)
                                                                    
                                                                    // Base Calculations (Needed for display)
                                                                    const baseMerc = breakdown.mercadorias * 0.08
                                                                    const baseServ = breakdown.servicos * 0.32
                                                                    const totalBase = baseMerc + baseServ
                                                                    const irpjMerc = totalBase > 0 ? (irpjTotal * (baseMerc / totalBase)) : 0
                                                                    const irpjServ = totalBase > 0 ? (irpjTotal * (baseServ / totalBase)) : 0
                                                                    const distMerc = baseMerc - irpjMerc
                                                                    const distServ = baseServ - irpjServ

                                                                    return (
                                                                        <TableRow key={index} className="hover:bg-muted/50 align-top font-medium">
                                                                            <TableCell className="py-1 text-sm font-semibold">{periodoDisplay}</TableCell>
                                                                            <TableCell className="py-1">
                                                                                <div className="flex flex-col gap-1">
                                                                                    {breakdown.mercadorias > 0 && (
                                                                                        <div className="flex flex-col">
                                                                                            <span className="text-[11px] font-bold uppercase text-[#007AFF] dark:text-[#00C2FF]">Mercadorias</span>
                                                                                            <span className="font-bold text-xs">{breakdown.mercadorias.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {breakdown.servicos > 0 && (
                                                                                        <div className="flex flex-col">
                                                                                            <span className="text-[11px] font-bold uppercase text-[#3D5AFE] dark:text-[#3D5AFE]">Serviços</span>
                                                                                            <span className="font-bold text-xs">{breakdown.servicos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </TableCell>
                                                                            <TableCell className="py-1">
                                                                                <div className="flex flex-col gap-1">
                                                                                    {breakdown.mercadorias > 0 && (
                                                                                        <div className="flex flex-col">
                                                                                            <span className="text-[11px] font-bold text-[#007AFF] dark:text-[#00C2FF]">Mercadorias</span>
                                                                                            <span className="font-bold text-xs">{irpjMerc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {breakdown.servicos > 0 && (
                                                                                        <div className="flex flex-col">
                                                                                            <span className="text-[11px] font-bold text-[#3D5AFE] dark:text-[#3D5AFE]">Serviços</span>
                                                                                            <span className="font-bold text-xs">{irpjServ.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </TableCell>
                                                                            <TableCell className="py-1">
                                                                                <div className="flex flex-col gap-1">
                                                                                    {breakdown.mercadorias > 0 && (
                                                                                        <div className="flex flex-col">
                                                                                            <span className="text-[11px] font-bold text-[#007AFF] dark:text-[#00C2FF]">Mercadorias: 8%</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {breakdown.servicos > 0 && (
                                                                                        <div className="flex flex-col">
                                                                                            <span className="text-[11px] font-bold text-[#3D5AFE] dark:text-[#3D5AFE]">Serviços: 32%</span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </TableCell>
                                                                            <TableCell className="py-1">
                                                                                <div className="flex flex-col gap-1">
                                                                                    {breakdown.mercadorias > 0 && (
                                                                                        <div className="flex flex-col">
                                                                                            <span className="text-[11px] font-bold text-[#007AFF] dark:text-[#00C2FF]">Mercadorias</span>
                                                                                            <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300">
                                                                                                {distMerc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                                            </span>
                                                                                        </div>
                                                                                    )}
                                                                                    {breakdown.servicos > 0 && (
                                                                                        <div className="flex flex-col">
                                                                                            <span className="text-[11px] font-bold text-[#3D5AFE] dark:text-[#3D5AFE]">Serviços</span>
                                                                                            <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300">
                                                                                                {distServ.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                                            </span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </TableCell>
                                                                            <TableCell className="py-1">
                                                                                <div className="flex flex-col gap-1">
                                                                                    <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300">
                                                                                        {(distMerc + distServ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                                    </span>
                                                                                </div>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    )
                                                                })}
                                                            </React.Fragment>
                                                        )
                                                    })}

                                                    {/* 2. Year Totals Rows */}
                                                    {years.map(year => {
                                                        const yearTotal = totalsByYear[year]
                                                        return (
                                                            <TableRow key={`total-${year}`} className="bg-muted/30 font-bold border-t-2 border-muted">
                                                                <TableCell className="py-2 text-sm">Total {year}</TableCell>
                                                                <TableCell className="py-2">
                                                                    <div className="flex flex-col gap-1">
                                                                        {yearTotal.recMerc > 0 && (
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[11px] font-bold uppercase text-[#007AFF] dark:text-[#00C2FF]">Mercadorias</span>
                                                                                <span className="font-bold text-xs">{yearTotal.recMerc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                            </div>
                                                                        )}
                                                                        {yearTotal.recServ > 0 && (
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[11px] font-bold uppercase text-[#3D5AFE] dark:text-[#3D5AFE]">Serviços</span>
                                                                                <span className="font-bold text-xs">{yearTotal.recServ.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="py-2">
                                                                     <div className="flex flex-col gap-1">
                                                                        {(yearTotal.recMerc > 0 || yearTotal.irpjMerc > 0) && (
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[11px] font-bold text-[#007AFF] dark:text-[#00C2FF]">Mercadorias</span>
                                                                                <span className="font-bold text-xs">{yearTotal.irpjMerc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                            </div>
                                                                        )}
                                                                        {(yearTotal.recServ > 0 || yearTotal.irpjServ > 0) && (
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[11px] font-bold text-[#3D5AFE] dark:text-[#3D5AFE]">Serviços</span>
                                                                                <span className="font-bold text-xs">{yearTotal.irpjServ.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="py-2"></TableCell>
                                                                <TableCell className="py-2">
                                                                    <div className="flex flex-col gap-1">
                                                                        {(yearTotal.recMerc > 0 || yearTotal.distMerc > 0) && (
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[11px] font-bold text-[#007AFF] dark:text-[#00C2FF]">Mercadorias</span>
                                                                                <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300">
                                                                                    {yearTotal.distMerc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        {(yearTotal.recServ > 0 || yearTotal.distServ > 0) && (
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[11px] font-bold text-[#3D5AFE] dark:text-[#3D5AFE]">Serviços</span>
                                                                                <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300">
                                                                                    {yearTotal.distServ.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="py-2">
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300">
                                                                            {(yearTotal.distMerc + yearTotal.distServ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                        </span>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    })}

                                                    {/* Grand Total Row */}
                                                     <TableRow className="bg-muted/50 font-extrabold border-t-2 border-primary/20">
                                                        <TableCell className="py-3 text-sm">Total Geral</TableCell>
                                                        <TableCell className="py-3">
                                                            <div className="flex flex-col gap-1">
                                                                {grandTotal.recMerc > 0 && (
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[11px] font-bold uppercase text-[#007AFF] dark:text-[#00C2FF]">Mercadorias</span>
                                                                        <span className="font-bold text-xs">{grandTotal.recMerc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                    </div>
                                                                )}
                                                                {grandTotal.recServ > 0 && (
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[11px] font-bold uppercase text-[#3D5AFE] dark:text-[#3D5AFE]">Serviços</span>
                                                                        <span className="font-bold text-xs">{grandTotal.recServ.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-3">
                                                             <div className="flex flex-col gap-1">
                                                                {(grandTotal.recMerc > 0 || grandTotal.irpjMerc > 0) && (
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[11px] font-bold text-[#007AFF] dark:text-[#00C2FF]">Mercadorias</span>
                                                                        <span className="font-bold text-xs">{grandTotal.irpjMerc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                    </div>
                                                                )}
                                                                {(grandTotal.recServ > 0 || grandTotal.irpjServ > 0) && (
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[11px] font-bold text-[#3D5AFE] dark:text-[#3D5AFE]">Serviços</span>
                                                                        <span className="font-bold text-xs">{grandTotal.irpjServ.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-3"></TableCell>
                                                        <TableCell className="py-3">
                                                            <div className="flex flex-col gap-1">
                                                                {(grandTotal.recMerc > 0 || grandTotal.distMerc > 0) && (
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[11px] font-bold text-[#007AFF] dark:text-[#00C2FF]">Mercadorias</span>
                                                                        <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300">
                                                                            {grandTotal.distMerc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {(grandTotal.recServ > 0 || grandTotal.distServ > 0) && (
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[11px] font-bold text-[#3D5AFE] dark:text-[#3D5AFE]">Serviços</span>
                                                                        <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300">
                                                                            {grandTotal.distServ.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-3">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300">
                                                                    {(grandTotal.distMerc + grandTotal.distServ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                </>
                                            )
                                        })()}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card className="mt-4" style={{ breakInside: 'avoid' }}>
                            <CardHeader className="py-2 flex flex-row items-center justify-between">
                                <CardTitle className={cn("text-base font-semibold", isPdfGen && "print-title-section")}>Sócios e Distribuição de Resultados</CardTitle>
                                {!isPdfGen && !isUnifiedView && (
                                    <Button variant="outline" size="sm" className="h-8" onClick={addPartner}>
                                        Adicionar sócio
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="pb-3 space-y-3">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Total disponível para distribuição</span>
                                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                                        {totalDistribution.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                </div>
                                {isUnifiedView && unifiedPartnersSummary && (
                                    <Table className={cn("text-xs", isPdfGen && "print-table")}>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Nome do Sócio</TableHead>
                                                {unifiedPartnersSummary.companies.map(company => (
                                                    <TableHead key={company.cnpj} className="text-right">
                                                        {company.name}
                                                    </TableHead>
                                                ))}
                                                <TableHead className="w-32 text-right">Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {unifiedPartnersSummary.partners.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={unifiedPartnersSummary.companies.length + 2} className="py-4 text-center text-muted-foreground">
                                                        Nenhum sócio cadastrado nas empresas unificadas.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {unifiedPartnersSummary.partners.map(row => (
                                                <TableRow key={row.key} className="align-middle">
                                                    <TableCell className="py-1">
                                                        <span className="font-medium">{row.name}</span>
                                                    </TableCell>
                                                    {unifiedPartnersSummary.companies.map(company => {
                                                        const cell = row.amounts.find((a: any) => a.cnpj === company.cnpj)
                                                        const amount = cell?.amount || 0
                                                        const pct = cell?.percentage || 0
                                                        return (
                                                            <TableCell key={company.cnpj} className="py-1 text-right">
                                                                <div className="flex flex-col items-end">
                                                                    <span>{amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                    {pct > 0 && (
                                                                        <span className="text-[10px] text-muted-foreground">
                                                                            {pct.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        )
                                                    })}
                                                    <TableCell className="py-1 text-right">
                                                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                                                            {row.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {/* Unified Total Row */}
                                            {unifiedPartnersSummary.partners.length > 0 && (
                                                <TableRow className="bg-muted/30 font-bold border-t-2 border-muted">
                                                    <TableCell className="py-2">Total</TableCell>
                                                    {unifiedPartnersSummary.companies.map(company => {
                                                        const colTotal = unifiedPartnersSummary.partners.reduce((sum, p) => {
                                                            const cell = p.amounts.find((a: any) => a.cnpj === company.cnpj)
                                                            return sum + (cell?.amount || 0)
                                                        }, 0)
                                                        return (
                                                            <TableCell key={company.cnpj} className="py-2 text-right">
                                                                {colTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                            </TableCell>
                                                        )
                                                    })}
                                                    <TableCell className="py-2 text-right text-emerald-700 dark:text-emerald-300">
                                                        {unifiedPartnersSummary.partners
                                                            .reduce((sum, p) => sum + p.total, 0)
                                                            .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                )}
                                {!isUnifiedView && (
                                    <>
                                        <Table className={cn("text-xs", isPdfGen && "print-table")}>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Nome do Sócio</TableHead>
                                                    <TableHead className="w-24 text-right">% Quota</TableHead>
                                                    <TableHead className="w-32 text-right">Valor</TableHead>
                                                    {!isPdfGen && <TableHead className="w-10"></TableHead>}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {currentPartners.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={isPdfGen ? 3 : 4} className="py-4 text-center text-muted-foreground">
                                                            Nenhum sócio cadastrado.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                                {currentPartners.map(p => (
                                                    <PartnerRow
                                                        key={p.id}
                                                        partner={p}
                                                        totalDistribution={totalDistribution}
                                                        isPdfGen={isPdfGen || false}
                                                        onUpdate={updatePartner}
                                                        onRemove={removePartner}
                                                    />
                                                ))}
                                                {/* Total Row */}
                                                {currentPartners.length > 0 && (
                                                    <TableRow className="bg-muted/30 font-bold border-t-2 border-muted">
                                                        <TableCell className="py-2">Total</TableCell>
                                                        <TableCell className={cn("py-2 text-right", Math.abs(partnersSumPercent - 100) > 0.01 ? "text-red-500" : "text-emerald-600")}>
                                                            {partnersSumPercent.toFixed(2)}%
                                                        </TableCell>
                                                        <TableCell className="py-2 text-right text-emerald-700 dark:text-emerald-300">
                                                            {(totalDistribution * (partnersSumPercent / 100)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                        </TableCell>
                                                        {!isPdfGen && <TableCell className="py-2"></TableCell>}
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                        {!isPdfGen && (
                                            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-2">
                                                <span className={cn(Math.abs(partnersSumPercent - 100) > 0.01 && "text-red-500 font-medium")}>
                                                    {Math.abs(partnersSumPercent - 100) < 0.01
                                                        ? 'Distribuição completa (100%)'
                                                        : `Atenção: A soma das quotas é ${partnersSumPercent.toFixed(2)}%. Ajuste para 100%.`}
                                                </span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                    {(!isPdfGen && !isConsolidated) && (
                        <>
                            <PGDASDProcessor
                                key={currentFile?.filename || selectedFileIndex}
                                initialData={currentFile?.data}
                                hideDownloadButton={true}
                                isOwner={isOwner}
                                isPdfGen={isPdfGen}
                                isEmbedded={isEmbedded}
                                hideDistributionTable={true}
                                shareId={dashboardCode ? (selectedFileIndex !== null ? `${dashboardCode}?view_file_index=${selectedFileIndex}` : dashboardCode) : undefined}
                            />
                        </>
                    )}

                    {isPdfGen && !onlyConsolidated && (
                        <div className="print-container">
                            {sortedFiles.map((file, idx) => (
                                <div key={idx} className="pdf-page-wrapper">
                                    <div className="pdf-page" style={{ height: 'auto', pageBreakAfter: idx < sortedFiles.length - 1 ? 'always' : 'auto' }}>
                                        <PGDASDProcessor
                                    initialData={file.data}
                                    hideDownloadButton={false}
                                    isOwner={isOwner}
                                    isPdfGen={true}
                                    isEmbedded={isEmbedded}
                                    showContactCard={idx === sortedFiles.length - 1}
                                    hideDistributionTable={true}
                                    shareId={dashboardCode ? (selectedFileIndex !== null ? `${dashboardCode}?view_file_index=${selectedFileIndex}` : dashboardCode) : undefined}
                                />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Sidebar - Replaced with UnifiedSidebar */}
            {!isPdfGen && (
                <UnifiedSidebar
                    files={localFiles}
                    selectedFileIndex={selectedFileIndex !== null 
                        ? localFiles.findIndex(f => f.filename === targetFilename) 
                        : null
                    }
                    onFileSelect={onFileSelect}
                    onAddFile={() => fileInputRef.current?.click()}
                    isConsolidatedView={isConsolidated}
                    onConsolidatedSelect={(cnpj) => {
                        if (cnpj) {
                            setActiveCnpj(cnpj)
                        }
                        setSelectedFileIndex(null)
                        setTargetFilename(null)
                    }}
                    isUploading={isUploading}
                    fileInputRef={fileInputRef}
                    onFileUpload={handleFileUpload}
                    isOwner={isOwner}
                    showConsolidatedOption={!isMultiCompany}
                    invalidFiles={invalidFiles}
                    activeCnpj={activeCnpj}
                    onDeleteFile={handleDeleteFile}
                    queuedFiles={queuedFiles}
                    onProcessQueue={handleProcessQueue}
                    onRemoveFromQueue={handleRemoveFromQueue}
                    activeTab={activeTab}
                    onTabSelect={setActiveTab}
                    hasUnifiedResults={unifiedViews.length > 0}
                    unifiedViews={unifiedViews}
                    onClearUnifiedResults={() => {
                        setUnifiedViews([])
                        setSelectedUnifyCnpjs(new Set())
                        if (activeCnpj && activeCnpj.startsWith('UNIFIED_')) setActiveCnpj(undefined)
                    }}
                />
            )}

            {/* Loading Overlay */}
            {isGeneratingPdf && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0f172a]/95 text-white">
                    <div className="text-center">
                        <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                        <h2 className="text-2xl font-bold mb-2">Gerando seu relatório...</h2>
                        <p className="text-slate-400">Isso pode levar alguns segundos.</p>
                    </div>
                </div>
            )}

            {/* Error Modal */}
            {showErrorModal && !isPdfGen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3A3A3A]/50 p-4">
                    <Card className="w-full max-w-lg shadow-xl border-destructive/50 bg-card">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-destructive flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5" />
                                Erros de Validação
                            </CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setShowErrorModal(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                                {uploadErrors.map((err, i) => (
                                    <Alert key={i} variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Erro</AlertTitle>
                                        <AlertDescription>{err}</AlertDescription>
                                    </Alert>
                                ))}
                            </div>
                            <div className="mt-4 flex justify-end gap-3">
                                <Button variant="secondary" onClick={() => setShowErrorModal(false)}>Cancelar</Button>
                                {pendingFiles.length > 0 && (
                                    <Button onClick={handleForceProcess} className="bg-[#007AFF] hover:bg-[#3A3A3A] text-white">
                                        Processar Mesmo Assim
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Queue Modal - REMOVED (Moved to Sidebar) */}
        </div>
    )
}
