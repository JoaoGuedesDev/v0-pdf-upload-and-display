'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useTheme } from "next-themes"
import { MonthlyFile, ReceitasAnteriores } from '../types'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ArrowLeft, AlertTriangle, ChevronRight, BarChart3, LayoutDashboard, Upload, X, CheckCircle, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { HeaderLogo } from "@/components/header-logo"
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
    isPdfGen?: boolean
    onFilesUpdated?: (files: MonthlyFile[]) => void
    receitas_anteriores?: ReceitasAnteriores
}

export function AnnualDashboard({ files, onBack, dashboardCode, initialViewIndex, isPdfGen, onFilesUpdated, receitas_anteriores }: AnnualDashboardProps) {
    const [localFiles, setLocalFiles] = useState<MonthlyFile[]>(files)
    const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(initialViewIndex ?? null)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadErrors, setUploadErrors] = useState<string[]>([])
    const [showErrorModal, setShowErrorModal] = useState(false)
    const [pendingFiles, setPendingFiles] = useState<MonthlyFile[]>([])

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


    const fileInputRef = useRef<HTMLInputElement>(null)
    const { theme } = useTheme()

    useEffect(() => {
        // Only update if files prop changes and is different (simple length check or deep compare if needed)
        // For now, assume prop update takes precedence
        if (files.length !== localFiles.length && files !== localFiles) {
            setLocalFiles(files)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [files])

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

            const errors: string[] = []
            const validFiles: MonthlyFile[] = []

            if (data.error) {
                // Instead of throwing, push to errors and continue if we have files
                errors.push(data.error)
            }

            const newFiles = data.files as { filename: string, data: any }[]

            // Validation Reference (from first existing file)
            const refCnpj = localFiles[0]?.data?.identificacao?.cnpj
            const refCompany = localFiles[0]?.data?.identificacao?.razaoSocial

            // Existing periods
            const existingPeriods = new Set(localFiles.map(f => f.data?.identificacao?.periodoApuracao))

            newFiles.forEach(nf => {
                const fCnpj = nf.data?.identificacao?.cnpj
                const fPeriod = nf.data?.identificacao?.periodoApuracao

                // Check Company
                if (refCnpj && fCnpj !== refCnpj) {
                    errors.push(`Arquivo '${nf.filename}': CNPJ ${fCnpj} difere da empresa atual (${refCnpj} - ${refCompany})`)
                    return
                }

                // Check Duplicate
                if (existingPeriods.has(fPeriod)) {
                    errors.push(`Arquivo '${nf.filename}': Período ${fPeriod} já existe no dashboard.`)
                    return
                }

                // Check Duplicate within new batch
                if (validFiles.some(vf => vf.data?.identificacao?.periodoApuracao === fPeriod)) {
                    errors.push(`Arquivo '${nf.filename}': Período ${fPeriod} duplicado no upload atual.`)
                    return
                }

                validFiles.push(nf)
            })

            if (errors.length > 0) {
                setUploadErrors(errors)
                // If we have valid files mixed with errors, or just errors that we might want to bypass (like duplicates if user insists, though usually duplicates are skipped. 
                // But request says 'continue showing error, appear option to continue'. 
                // So we should store ALL files attempted (or just the ones that failed? 
                // Actually, the request implies ignoring the errors.
                // Current logic separates validFiles (passed checks) and errors.
                // If we want to force process, we probably want to add the ones that caused errors? 
                // Or maybe the 'errors' are blocking validFiles from being added? 
                // The current code adds validFiles immediately even if there are errors (lines 145-153).
                // So if files really are valid, they are added.
                // The issue "Sequência de meses descontínua" likely comes from the server or logic I haven't seen yet?
                // Wait, I saw "Sequência de meses descontínua" in grep for api/process-annual-pdf/route.ts but NOT in this file.
                // Ah, line 100 thrown error!

                // If data.error is thrown, execution jumps to catch block (line 155). 
                // In that case validFiles is never processed.

                // If the error comes from individual checks (lines 115-138), validFiles are added.
                // The user's screenshot shows "Erro: Sequência de meses descontínua".
                // If that error is from `data.error` (server side), we need to handle it.
                // But `data.error` throws immediately.

                // Let's look at where that error comes from. 
                // If it's a server error 400 that returns JSON with error, we throw. 
                // We need to capture the files returned even if there is an error?
                // Or maybe the server returns processed files AND an error?

                // Assuming `data.files` is present even if `data.error` is present? 
                // If so, we shouldn't throw line 101 immediately if we want to allow bypass.

                // BUT, looking at the code: 
                // if (data.error) { throw new Error(data.error) }

                // If I remove this throw, the code proceeds to process `data.files`.
                // So I should instead push data.error to `errors` list and proceed, 
                // letting the user decide? 

                // HOWEVER, the logic below (115-138) processes `newFiles`. 
                // If `data.files` is valid, we can process it.

                // So I will change the logic to NOT throw on data.error, but add it to errors.
                // And I will store `validFiles` into `pendingFiles` if there are errors, preventing auto-add 
                // if we want to give 'continue' option? 
                // Or just add them and show error? 
                // The user said: "continue showing error, appear option ... and process anyway".
                // Detailed interpretation: The process is currently BLOCKED.
                // If `validFiles` are added immediately (lines 145), then it's not blocked? 
                // Unless `data.files` is empty or undefined because of the error?

                // Let's assume the server returns `files` even with that error, or used to.
                // If the error is "Sequência...", it implies some validation.

                // Strategy: 
                // 1. Do NOT throw on data.error if data.files exists. 
                // 2. If errors exist, DO NOT add to localFiles immediately. 
                // 3. Set pendingFiles = validFiles.
                // 4. Show Modal. 
                // 5. "Processar Mesmo Assim" moves pendingFiles to localFiles.

                setPendingFiles(validFiles)
                setShowErrorModal(true)
            } else if (validFiles.length > 0) {
                // No errors, add immediately
                setLocalFiles(prev => {
                    const updated = [...prev, ...validFiles]
                    if (onFilesUpdated) setTimeout(() => onFilesUpdated(updated), 0)
                    return updated
                })
            }

        } catch (err: any) {
            setUploadErrors([err.message || "Erro ao processar arquivos"])
            setShowErrorModal(true)
        } finally {
            setIsUploading(false)
        }
    }

    const handleForceProcess = () => {
        if (pendingFiles.length > 0) {
            setLocalFiles(prev => {
                const updated = [...prev, ...pendingFiles]
                if (onFilesUpdated) setTimeout(() => onFilesUpdated(updated), 0)
                return updated
            })
        }
        setShowErrorModal(false)
        setPendingFiles([])
        setUploadErrors([])
    }

    // Unified DataLabels Configuration
    const datalabelsConfig = {
        align: 'end' as const,
        anchor: 'end' as const,
        clamp: true,
        clip: false,
        color: 'white',
        textStrokeColor: 'black',
        textStrokeWidth: 2,
        font: { weight: 'bold' as const, size: 10 },
        formatter: (value: number) => {
            if (value === 0) return ''
            return value.toFixed(2)
        }
    }

    const handleExportPdf = () => {
        const sorted = [...localFiles].sort((a, b) => {
            const dateA = new Date(a.data?.identificacao?.periodoApuracao || '')
            const dateB = new Date(b.data?.identificacao?.periodoApuracao || '')
            return dateA.getTime() - dateB.getTime()
        })

        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        let path = dashboardCode ? `/d/${dashboardCode}` : (window.location.pathname + window.location.search)

        const sep = path.includes('?') ? '&' : '?'
        path = path + sep + 'pdf_gen=true'

        // Append visibility settings
        const visibleParts = []
        if (visibleCharts.quarterly) visibleParts.push('quarterly')
        if (visibleCharts.semiannual) visibleParts.push('semiannual')
        if (visibleCharts.annual) visibleParts.push('annual')

        if (visibleParts.length > 0) {
            path += `&visible=${visibleParts.join(',')}`
        }

        const rs = sorted[0]?.data?.identificacao?.razaoSocial || 'Empresa'
        const safeName = rs.replace(/[^a-z0-9à-ú .-]/gi, '_')
        const filename = `Relatorio_Anual_${safeName}.pdf`

        const url = `${origin}/api/pdf?path=${encodeURIComponent(path)}&type=screen&w=1600&scale=1&download=true&filename=${encodeURIComponent(filename)}`

        try {
            window.open(url, '_blank')
        } catch {
            window.location.assign(url)
        }
    }

    const isDark = theme === 'dark'
    const chartTheme = useMemo(() => ({
        grid: isDark ? '#334155' : '#e2e8f0',
        text: isDark ? '#f8fafc' : '#020617',
        tooltipBg: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        tooltipTitle: isDark ? '#f1f5f9' : '#020617',
        tooltipBody: isDark ? '#cbd5e1' : '#1e293b',
        tooltipBorder: isDark ? '#475569' : '#e2e8f0'
    }), [isDark])

    const sortedFiles = [...localFiles].sort((a, b) => {
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
        sortedFiles.forEach(f => {
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
        if (sortedFiles.length > 0) {
            const filesToProcess = [sortedFiles[0]]
            if (sortedFiles.length > 1) {
                filesToProcess.push(sortedFiles[sortedFiles.length - 1])
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

        return map
    }, [sortedFiles, receitas_anteriores])

    const years = useMemo(() => {
        const s = new Set<number>()
        // From consolidated data
        consolidatedData.forEach((_, key) => {
            const y = parseInt(key.split('-')[0])
            if (!isNaN(y)) s.add(y)
        })
        return Array.from(s).sort((a, b) => a - b)
    }, [consolidatedData])

    // Monthly Data By Year (Updated to use consolidatedData)
    const monthlyDataByYear = useMemo(() => {
        const map = new Map<number, { labels: string[], revenue: number[], taxes: number[] }>()
        years.forEach(y => {
            const labels: string[] = []
            const revenue: number[] = []
            const taxes: number[] = []

            // We iterate 1-12
            for (let m = 1; m <= 12; m++) {
                const key = `${y}-${String(m).padStart(2, '0')}`
                const val = consolidatedData.get(key)
                if (val !== undefined) {
                    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
                    labels.push(monthNames[m - 1])
                    revenue.push(val)
                    // Taxes only available for explicit files, difficult to get from history if not stored
                    // Attempt to find explicit file for taxes
                    const file = sortedFiles.find(f => {
                        const p = parsePeriod(f.data.identificacao.periodoApuracao)
                        return p.y === y && p.m === m
                    })
                    taxes.push(file?.data.tributos.Total || 0)
                }
            }
            if (labels.length > 0) {
                 map.set(y, { labels, revenue, taxes })
            }
        })
        return map
    }, [years, consolidatedData, sortedFiles])

    // Aggregated Data for Comparison (Multi-View)
    const allComparisonData = useMemo(() => {
        const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'] // Blue, Green, Amber, Violet, Pink, Indigo

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

                datasets.push({
                    label: `${y}`,
                    data,
                    backgroundColor: colors[idx % colors.length],
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.8,
                    datalabels: {
                        display: true,
                        ...datalabelsConfig
                    }
                })
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
                return sum
            })
            
            return {
                labels,
                datasets: [{
                    label: 'Receita Anual',
                    data,
                    backgroundColor: years.map((_, i) => colors[i % colors.length]),
                    borderRadius: 4,
                    barThickness: 60,
                    datalabels: {
                        display: true,
                        ...datalabelsConfig
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

    // Chart Options Boilerplate
    const chartOptions = {
        layout: {
            padding: {
                top: 30,
                right: 20,
                left: 10,
                bottom: 0
            }
        },
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: { color: chartTheme.text }
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
                display: true,
                // Line chart specific overrides: No stroke, clamp to chart area
                ...datalabelsConfig,
                align: 'end' as const,
                anchor: 'end' as const,
                color: chartTheme.text,
                textStrokeWidth: 0,
                clamp: true,
            }
        },
        scales: {
            y: {
                grid: { color: chartTheme.grid },
                ticks: { color: chartTheme.text, callback: (v: any) => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v) }
            },
            x: {
                grid: { color: chartTheme.grid },
                ticks: { color: chartTheme.text }
            }
        }
    }

    const monthlyRevenueBreakdown = useMemo(() => {
        return sortedFiles.map(file => {
            const dados = file.data as any
            const detalhe = dados.calculos?.analise_aliquota?.detalhe || []

            let servicos = 0
            let mercadorias = 0
            let industria = 0

            if (detalhe.length > 0) {
                detalhe.forEach((d: any) => {
                    const anexo = Number(d.anexo)
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
                // Fallback logic
                const rpa = dados.receitas?.receitaPA || 0
                if (dados.cenario === 'servicos') servicos = rpa
                else if (dados.cenario === 'mercadorias') mercadorias = rpa
                else if (dados.cenario === 'misto') {
                    // Try to use debug activities if analise_aliquota is missing
                    const atividades = dados.debug?.atividades || []
                    if (atividades.length > 0) {
                        atividades.forEach((at: any) => {
                            const nome = String(at.nome || at.name || at.descricao || '').toLowerCase()
                            const val = Number(at.receita_bruta_informada || 0)
                            if (nome.includes('servi')) servicos += val
                            else mercadorias += val
                        })
                    } else {
                        // Even split fallback? Or just put everything in one bucket based on hints?
                        // Let's assume equal split if we really don't know, or just dump to services (safest for many clients)
                        // But actually, we have 'tributosMercadoriasInterno' etc.
                        const tServ = (dados.tributosServicosInterno?.Total || 0) + (dados.tributosServicosExterno?.Total || 0)
                        const tMerc = (dados.tributosMercadoriasInterno?.Total || 0) + (dados.tributosMercadoriasExterno?.Total || 0)
                        if (tServ + tMerc > 0) {
                            servicos = rpa * (tServ / (tServ + tMerc))
                            mercadorias = rpa * (tMerc / (tServ + tMerc))
                        } else {
                            servicos = rpa // Default
                        }
                    }
                }
            }

            return {
                month: file.data.identificacao.periodoApuracao.split(' ')[0],
                servicos,
                mercadorias,
                industria
            }
        })
    }, [sortedFiles])

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
            barPercentage: 0.6,
            categoryPercentage: 0.8,
            datalabels: {
                display: true,
                ...datalabelsConfig
            }
        }

        if (totalMercadorias > 0) {
            datasets.push({
                label: 'Mercadorias',
                data: monthlyRevenueBreakdown.map(d => d.mercadorias),
                backgroundColor: '#3b82f6',
                hoverBackgroundColor: '#2563eb',
                stack: 'Stack 0',
                ...common
            })
        }

        if (totalIndustria > 0) {
            datasets.push({
                label: 'Indústria',
                data: monthlyRevenueBreakdown.map(d => d.industria),
                backgroundColor: '#10b981',
                hoverBackgroundColor: '#059669',
                stack: 'Stack 0',
                ...common
            })
        }

        if (totalServicos > 0) {
            datasets.push({
                label: 'Serviços',
                data: monthlyRevenueBreakdown.map(d => d.servicos),
                backgroundColor: '#8b5cf6',
                hoverBackgroundColor: '#7c3aed',
                stack: 'Stack 0',
                ...common
            })
        }

        return {
            labels,
            datasets
        }
    }, [monthlyRevenueBreakdown])

    const revenueBreakdown = useMemo(() => {
        let servicos = 0
        let mercadorias = 0
        let industrializacao = 0

        sortedFiles.forEach(file => {
            const dados = file.data as any
            const atividades = dados.debug?.atividades || []

            if (atividades.length > 0) {
                atividades.forEach((at: any) => {
                    const nome = String(at.nome || at.name || at.descricao || '').toLowerCase()
                    const valor = Number(at.receita_bruta_informada || 0)
                    const cleanNome = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

                    if (/(servico|servicos|prestacao)/.test(cleanNome)) {
                        servicos += valor
                    } else if (/(industria|industrializacao)/.test(cleanNome)) {
                        industrializacao += valor
                    } else {
                        mercadorias += valor
                    }
                })
            } else {
                const rpa = dados.receitas?.receitaPA || 0
                if (dados.cenario === 'servicos') servicos += rpa
                else if (dados.cenario === 'mercadorias') mercadorias += rpa
                // If mixed and no activities, we can't reliably split, but we'll try our best
            }
        })

        return { servicos, mercadorias, industrializacao }
    }, [sortedFiles])

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

        // Semiannual
        const semiannual = sortedYears.flatMap(year => {
             const prevYear = year - 1
             if (!years.includes(prevYear)) return []

             return [1, 2].map(sem => {
                 const currDataset = allComparisonData.semiannual.datasets.find((d: any) => d.label === String(year))
                 const prevDataset = allComparisonData.semiannual.datasets.find((d: any) => d.label === String(prevYear))
                 
                 const currVal = currDataset?.data[sem - 1] || 0
                 const prevVal = prevDataset?.data[sem - 1] || 0
                 
                 if (currVal === 0 && prevVal === 0) return null

                 return {
                     period: `${sem}º Semestre`,
                     currentLabel: `${sem}º Sem ${year}`,
                     prevLabel: `${sem}º Sem ${prevYear}`,
                     current: formatCurrency(currVal),
                     previous: formatCurrency(prevVal),
                     ...calcVar(currVal, prevVal)
                 }
             }).filter(Boolean)
        })

        // Quarterly
        const quarterly = sortedYears.flatMap(year => {
             const prevYear = year - 1
             if (!years.includes(prevYear)) return []

             return [1, 2, 3, 4].map(q => {
                 const currDataset = allComparisonData.quarterly.datasets.find((d: any) => d.label === String(year))
                 const prevDataset = allComparisonData.quarterly.datasets.find((d: any) => d.label === String(prevYear))
                 
                 const currVal = currDataset?.data[q - 1] || 0
                 const prevVal = prevDataset?.data[q - 1] || 0

                 if (currVal === 0 && prevVal === 0) return null

                 return {
                     period: `${q}º Trimestre`,
                     currentLabel: `${q}º Trim ${year}`,
                     prevLabel: `${q}º Trim ${prevYear}`,
                     current: formatCurrency(currVal),
                     previous: formatCurrency(prevVal),
                     ...calcVar(currVal, prevVal)
                 }
             }).filter(Boolean)
        })

        return { annual, semiannual, quarterly }
    }, [years, allComparisonData])

    const barChartData = useMemo(() => {
        const labels = []
        const data = []
        const colors = []

        if (revenueBreakdown.mercadorias > 0) {
            labels.push('Mercadorias')
            data.push(revenueBreakdown.mercadorias)
            colors.push('rgba(59, 130, 246, 0.8)')
        }
        if (revenueBreakdown.servicos > 0) {
            labels.push('Serviços')
            data.push(revenueBreakdown.servicos)
            colors.push('rgba(139, 92, 246, 0.8)')
        }
        if (revenueBreakdown.industrializacao > 0) {
            labels.push('Indústria')
            data.push(revenueBreakdown.industrializacao)
            colors.push('rgba(16, 185, 129, 0.8)')
        }

        // Fallback if empty (shouldn't happen if there is revenue)
        if (labels.length === 0 && totalRevenue > 0) {
            labels.push('Total')
            data.push(totalRevenue)
            colors.push('rgba(156, 163, 175, 0.8)')
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

    return (
        <div className={`flex flex-col lg:flex-row min-h-screen bg-background ${isPdfGen ? 'w-[1600px] mx-auto overflow-hidden' : ''}`}>

            {/* Main Content Area */}
            <div className="flex-1 order-2 lg:order-1 min-w-0">
                <div className={`relative ${isPdfGen ? 'max-w-none' : ''}`}>
                    {isConsolidated ? (
                        <div className="p-6 space-y-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-foreground">Visão Geral Anual</h1>
                                    <p className="text-muted-foreground">Consolidado de {sortedFiles.length} períodos apurados</p>
                                </div>
                                <DashboardActions
                                    onUpload={handleFileUpload}
                                    isUploading={isUploading}
                                    onExportPdf={handleExportPdf}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Receita Bruta Total</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                            {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Média: {averageRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Total de Impostos</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                            {totalTaxes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Média: {averageTaxes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Alíquota Efetiva Média</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                            {averageTaxRate.toFixed(2)}%
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-6">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle>Evolução Financeira</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-8">
                                        {years.map(year => (
                                            <div key={year} className="h-[300px]">
                                                <h3 className="text-sm font-semibold mb-2 text-center text-muted-foreground">Ano {year}</h3>
                                                <Line
                                                    options={chartOptions}
                                                    data={{
                                                        labels: monthlyDataByYear.get(year)?.labels || [],
                                                        datasets: [
                                                            {
                                                                label: 'Receita Bruta',
                                                                data: monthlyDataByYear.get(year)?.revenue || [],
                                                                borderColor: '#2563eb',
                                                                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                                                                tension: 0.4,
                                                                fill: true
                                                            },
                                                            {
                                                                label: 'Impostos',
                                                                data: monthlyDataByYear.get(year)?.taxes || [],
                                                                borderColor: '#dc2626',
                                                                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                                                                tension: 0.4,
                                                                fill: true
                                                            }
                                                        ]
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                {/* Chart Visibility Toggles */}
                                <div className="flex justify-end gap-2 mb-2">
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

                                <div className={cn(
                                    "grid gap-6 grid-cols-1",
                                    Object.values(visibleCharts).filter(Boolean).length === 1 ? "md:grid-cols-1" :
                                        Object.values(visibleCharts).filter(Boolean).length === 2 ? "md:grid-cols-2" :
                                            "md:grid-cols-3"
                                )}>
                                    {visibleCharts.quarterly && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-sm font-medium">Comparativo Trimestral</CardTitle>
                                            </CardHeader>
                                            <CardContent className="h-[300px]">
                                                <Bar
                                                    options={chartOptions}
                                                    data={allComparisonData.quarterly}
                                                />
                                            </CardContent>
                                        </Card>
                                    )}

                                    {visibleCharts.semiannual && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-sm font-medium">Comparativo Semestral</CardTitle>
                                            </CardHeader>
                                            <CardContent className="h-[300px]">
                                                <Bar
                                                    options={chartOptions}
                                                    data={allComparisonData.semiannual}
                                                />
                                            </CardContent>
                                        </Card>
                                    )}

                                    {visibleCharts.annual && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-sm font-medium">Comparativo Anual</CardTitle>
                                            </CardHeader>
                                            <CardContent className="h-[300px]">
                                                <Bar
                                                    options={chartOptions}
                                                    data={allComparisonData.annual}
                                                />
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Composição do Faturamento Mensal</CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-[300px]">
                                        <Bar
                                            options={{
                                                ...chartOptions,
                                                maintainAspectRatio: false,
                                                plugins: {
                                                    ...chartOptions.plugins,
                                                    legend: {
                                                        display: true,
                                                        position: 'bottom',
                                                        labels: { color: chartTheme.text }
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
                                                        stacked: true,
                                                    },
                                                    y: {
                                                        ...chartOptions.scales?.y,
                                                        stacked: true,
                                                    }
                                                }
                                            }}
                                            data={stackedBarChartData}
                                        />
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Analysis Report */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Relatório de Análise Comparativa</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-8">
                                        {[
                                            { title: 'Comparativo Anual', data: detailedAnalysis.annual },
                                            { title: 'Comparativo Semestral', data: detailedAnalysis.semiannual },
                                            { title: 'Comparativo Trimestral', data: detailedAnalysis.quarterly }
                                        ].map((section, idx) => (
                                            <div key={idx} className="space-y-4">
                                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                                    {section.title}
                                                </h3>
                                                {section.data.length > 0 ? (
                                                    <div className="rounded-md border">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead className="w-[200px]">Período</TableHead>
                                                                    <TableHead>Receita Atual</TableHead>
                                                                    <TableHead>Receita Anterior</TableHead>
                                                                    <TableHead>Variação (R$)</TableHead>
                                                                    <TableHead>Variação (%)</TableHead>
                                                                    <TableHead className="text-right">Tendência</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {section.data.map((row: any, rIdx: number) => (
                                                                    <TableRow key={rIdx}>
                                                                        <TableCell className="font-medium">
                                                                            <div className="flex flex-col">
                                                                                <span>{row.period}</span>
                                                                                <span className="text-xs text-muted-foreground">{row.currentLabel} vs {row.prevLabel}</span>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell>{row.current}</TableCell>
                                                                        <TableCell className="text-muted-foreground">{row.previous}</TableCell>
                                                                        <TableCell className={cn(
                                                                            "font-medium",
                                                                            row.isPositive ? "text-emerald-600" : row.isNeutral ? "text-muted-foreground" : "text-red-600"
                                                                        )}>
                                                                            {row.isPositive ? '+' : ''}{row.abs}
                                                                        </TableCell>
                                                                        <TableCell className={cn(
                                                                            "font-bold",
                                                                            row.isPositive ? "text-emerald-600" : row.isNeutral ? "text-muted-foreground" : "text-red-600"
                                                                        )}>
                                                                            {row.isPositive ? '+' : ''}{row.pct}
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                            {row.isNeutral ? (
                                                                                <Minus className="inline h-4 w-4 text-muted-foreground" />
                                                                            ) : row.isPositive ? (
                                                                                <div className="flex items-center justify-end gap-1 text-emerald-600">
                                                                                    <ArrowUpRight className="h-4 w-4" />
                                                                                    <span className="text-xs">Crescimento</span>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex items-center justify-end gap-1 text-red-600">
                                                                                    <ArrowDownRight className="h-4 w-4" />
                                                                                    <span className="text-xs">Queda</span>
                                                                                </div>
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-muted-foreground italic">
                                                        Dados insuficientes para comparação neste período.
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Detalhamento Mensal</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Período</TableHead>
                                                <TableHead>Receita Bruta</TableHead>
                                                <TableHead>IRPJ</TableHead>
                                                <TableHead>Alíquota</TableHead>
                                                <TableHead>Distribuição</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sortedFiles.map((file, index) => {
                                                const breakdown = monthlyRevenueBreakdown[index]
                                                const irpjTotal = file.data.tributos?.IRPJ || 0
                                                const rawPeriod = file.data.identificacao.periodoApuracao

                                                // Format period: 01/06/2024 -> 06/2024
                                                let periodoDisplay = rawPeriod
                                                const pParts = rawPeriod.split(' ')[0].split('/')
                                                if (pParts.length === 3) {
                                                    periodoDisplay = `${pParts[1]}/${pParts[2]}`
                                                }

                                                // Base Calculations for IRPJ proration
                                                const baseMerc = breakdown.mercadorias * 0.08
                                                const baseServ = breakdown.servicos * 0.32
                                                // Assuming Industry follows Mercadorias logic or similar for simplicity unless specified otherwise in future
                                                // For now, we only focus on Merc/Serv as requested in prompt for the text

                                                const totalBase = baseMerc + baseServ
                                                const irpjMerc = totalBase > 0 ? (irpjTotal * (baseMerc / totalBase)) : 0
                                                const irpjServ = totalBase > 0 ? (irpjTotal * (baseServ / totalBase)) : 0

                                                const totalRevenue = breakdown.mercadorias + breakdown.servicos + breakdown.industria

                                                return (
                                                    <TableRow key={index} className="hover:bg-muted/50 align-top">
                                                        <TableCell className="font-medium whitespace-nowrap py-2 text-sm">{periodoDisplay}</TableCell>
                                                        <TableCell className="min-w-[300px] py-2">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[11px] font-semibold uppercase text-muted-foreground">Mercadorias</span>
                                                                    <span className="font-medium text-sm">{breakdown.mercadorias.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[11px] font-semibold uppercase text-muted-foreground">Serviços</span>
                                                                    <span className="font-medium text-sm">{breakdown.servicos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-2">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[11px] text-muted-foreground">Mercadorias</span>
                                                                    <span className="font-medium text-sm">{irpjMerc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[11px] text-muted-foreground">Serviços</span>
                                                                    <span className="font-medium text-sm">{irpjServ.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-2">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="text-sm font-medium">Mercadorias: <span className="font-bold">8%</span></div>
                                                                <div className="text-sm font-medium">Serviços: <span className="font-bold">32%</span></div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-2">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[11px] text-muted-foreground">Mercadorias</span>
                                                                    <span className="font-medium text-sm text-emerald-600 dark:text-emerald-400">
                                                                        {(baseMerc - irpjMerc).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[11px] text-muted-foreground">Serviços</span>
                                                                    <span className="font-medium text-sm text-emerald-600 dark:text-emerald-400">
                                                                        {(baseServ - irpjServ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                            {(() => {
                                                const totals = sortedFiles.reduce((acc, file, index) => {
                                                    const breakdown = monthlyRevenueBreakdown[index]
                                                    const irpjTotal = file.data.tributos?.IRPJ || 0

                                                    const baseMerc = breakdown.mercadorias * 0.08
                                                    const baseServ = breakdown.servicos * 0.32
                                                    const totalBase = baseMerc + baseServ

                                                    const irpjMerc = totalBase > 0 ? (irpjTotal * (baseMerc / totalBase)) : 0
                                                    const irpjServ = totalBase > 0 ? (irpjTotal * (baseServ / totalBase)) : 0

                                                    return {
                                                        recMerc: acc.recMerc + breakdown.mercadorias,
                                                        recServ: acc.recServ + breakdown.servicos,
                                                        irpjMerc: acc.irpjMerc + irpjMerc,
                                                        irpjServ: acc.irpjServ + irpjServ,
                                                        distMerc: acc.distMerc + (baseMerc - irpjMerc),
                                                        distServ: acc.distServ + (baseServ - irpjServ)
                                                    }
                                                }, { recMerc: 0, recServ: 0, irpjMerc: 0, irpjServ: 0, distMerc: 0, distServ: 0 })

                                                return (
                                                    <TableRow className="bg-muted/50 font-bold border-t-2 border-border">
                                                        <TableCell className="py-2 text-sm">Total Anual</TableCell>
                                                        <TableCell className="py-2">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[11px] font-bold uppercase text-muted-foreground">Mercadorias</span>
                                                                    <span className="font-bold text-sm">{totals.recMerc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[11px] font-bold uppercase text-muted-foreground">Serviços</span>
                                                                    <span className="font-bold text-sm">{totals.recServ.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-2">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[11px] font-bold text-muted-foreground">Mercadorias</span>
                                                                    <span className="font-bold text-sm">{totals.irpjMerc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[11px] font-bold text-muted-foreground">Serviços</span>
                                                                    <span className="font-bold text-sm">{totals.irpjServ.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-2"></TableCell>
                                                        <TableCell className="py-2">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[11px] font-bold text-muted-foreground">Mercadorias</span>
                                                                    <span className="font-bold text-sm text-emerald-700 dark:text-emerald-300">
                                                                        {totals.distMerc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[11px] font-bold text-muted-foreground">Serviços</span>
                                                                    <span className="font-bold text-sm text-emerald-700 dark:text-emerald-300">
                                                                        {totals.distServ.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })()}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <>
                            {!isPdfGen && onBack && (
                                <div className="absolute top-4 left-4 z-10 print:hidden">
                                    <Button variant="ghost" onClick={onBack} className="bg-white/50 hover:bg-white/80 backdrop-blur-sm gap-2 shadow-sm border border-white/20">
                                        <ArrowLeft className="h-4 w-4" />
                                        Voltar
                                    </Button>
                                </div>
                            )}

                            <PGDASDProcessor
                                key={currentFile?.filename || selectedFileIndex}
                                initialData={currentFile?.data}
                                hideDownloadButton={false}
                                isOwner={true}
                                isPdfGen={isPdfGen}
                                shareId={dashboardCode ? (selectedFileIndex !== null ? `${dashboardCode}?view_file_index=${selectedFileIndex}` : dashboardCode) : undefined}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Right Sidebar */}
            <div className={`w-full lg:w-80 border-l border-border bg-card order-1 lg:order-2 lg:h-screen lg:sticky lg:top-0 overflow-y-auto print:hidden ${isPdfGen ? 'hidden' : ''}`}>
                <div className="p-4 border-b border-border sticky top-0 bg-card z-10 flex flex-col gap-4">
                    <div className="flex justify-center lg:justify-start">
                        <HeaderLogo className="h-8" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-foreground">Navegação Rápida ({sortedFiles.length})</h2>
                        <p className="text-xs text-muted-foreground">Selecione um período para detalhar</p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-3 flex items-center gap-2 bg-background hover:bg-muted"
                            onClick={() => fileInputRef.current?.click()}
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
                            onChange={handleFileUpload}
                            className="hidden"
                            accept="application/pdf"
                            multiple
                        />
                    </div>
                </div>
                <div className="p-4 space-y-2">
                    {/* Overview Option */}
                    <button
                        onClick={() => setSelectedFileIndex(null)}
                        className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                            isConsolidated
                                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm ring-1 ring-blue-200 dark:ring-blue-800"
                                : "hover:bg-muted border border-transparent"
                        )}
                    >
                        <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            isConsolidated ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400" : "bg-muted text-muted-foreground"
                        )}>
                            <LayoutDashboard className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <p className={cn("font-medium text-sm", isConsolidated ? "text-blue-900 dark:text-blue-100" : "text-foreground")}>
                                Visão Geral
                            </p>
                            <p className="text-xs text-muted-foreground">Consolidado Anual</p>
                        </div>
                        {isConsolidated && <ChevronRight className="w-4 h-4 text-blue-500" />}
                    </button>

                    <div className="h-px bg-border my-2" />

                    {/* Monthly Options */}
                    {sortedFiles.map((file, index) => {
                        const isActive = selectedFileIndex === index
                        const fat = file.data?.receitas?.receitaPA || 0
                        const p = file.data?.identificacao?.periodoApuracao || 'N/A'

                        // Format period nicely
                        let label = p
                        try {
                            const parts = p.split(' ')[0].split('/')
                            let m = 0, y = ''
                            if (parts.length === 2) { m = parseInt(parts[0]); y = parts[1] }
                            else if (parts.length === 3) { m = parseInt(parts[1]); y = parts[2] }

                            if (m > 0 && m <= 12) {
                                const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
                                label = `${months[m - 1]} ${y}`
                            }
                        } catch { }

                        return (
                            <button
                                key={file.filename}
                                onClick={() => setSelectedFileIndex(index)}
                                className={cn(
                                    "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all border",
                                    isActive
                                        ? "bg-card border-blue-200 dark:border-blue-800 shadow-md ring-1 ring-blue-100 dark:ring-blue-900"
                                        : "bg-card border-border hover:border-muted-foreground/30 hover:shadow-sm"
                                )}
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                    isActive ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"
                                )}>
                                    <BarChart3 className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={cn("font-medium text-sm truncate capitalize", isActive ? "text-blue-900 dark:text-blue-100" : "text-foreground")}>
                                        {label}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        Fat: {fat.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' })}
                                    </p>
                                </div>
                                {isActive && <ChevronRight className="w-4 h-4 text-blue-500" />}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Error Modal */}
            {showErrorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
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
                                    <Button onClick={handleForceProcess} className="bg-blue-600 hover:bg-blue-700 text-white">
                                        Processar Mesmo Assim
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
