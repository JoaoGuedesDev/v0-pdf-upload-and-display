'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useTheme } from "next-themes"
import { MonthlyFile } from '../types'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ArrowLeft, AlertTriangle, ChevronRight, BarChart3, LayoutDashboard, Upload, X } from "lucide-react"
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
}

export function AnnualDashboard({ files, onBack, dashboardCode, initialViewIndex, isPdfGen, onFilesUpdated }: AnnualDashboardProps) {
    const [localFiles, setLocalFiles] = useState<MonthlyFile[]>(files)
    const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(initialViewIndex ?? null)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadErrors, setUploadErrors] = useState<string[]>([])
    const [showErrorModal, setShowErrorModal] = useState(false)
    const [granularity, setGranularity] = useState<'monthly' | 'quarterly' | 'semiannual' | 'annual'>('quarterly')

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
        setUploadErrors([])

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

            if (data.error) {
                throw new Error(data.error)
            }

            const newFiles = data.files as { filename: string, data: any }[]
            const errors: string[] = []
            const validFiles: MonthlyFile[] = []

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
                setShowErrorModal(true)
            }

            if (validFiles.length > 0) {
                setLocalFiles(prev => {
                    const updated = [...prev, ...validFiles]
                    if (onFilesUpdated) {
                        setTimeout(() => onFilesUpdated(updated), 0)
                    }
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

    // Unified DataLabels Configuration
    const datalabelsConfig = {
        align: 'center' as const,
        anchor: 'center' as const,
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
    const years = useMemo(() => {
        const s = new Set<number>()
        sortedFiles.forEach(f => {
            const p = f.data.identificacao.periodoApuracao
            const parts = p.split(' ')[0].split('/')
            if (parts.length >= 2) {
                const y = parseInt(parts.length === 3 ? parts[2] : parts[1])
                if (!isNaN(y)) s.add(y)
            }
        })
        return Array.from(s).sort((a, b) => a - b)
    }, [sortedFiles])

    // Helper to parse date
    const parsePeriod = (p: string) => {
        const parts = p.split(' ')[0].split('/')
        if (parts.length === 2) return { m: parseInt(parts[0]), y: parseInt(parts[1]) }
        if (parts.length === 3) return { m: parseInt(parts[1]), y: parseInt(parts[2]) }
        return { m: 0, y: 0 }
    }

    // Monthly Data By Year
    const monthlyDataByYear = useMemo(() => {
        const map = new Map<number, { labels: string[], revenue: number[], taxes: number[] }>()
        years.forEach(y => {
            const labels: string[] = []
            const revenue: number[] = []
            const taxes: number[] = []

            // Sort files first to ensure chronological order
            const filesForYear = sortedFiles.filter(f => {
                const { y: fy } = parsePeriod(f.data.identificacao.periodoApuracao)
                return fy === y
            }).sort((a, b) => {
                const { m: ma } = parsePeriod(a.data.identificacao.periodoApuracao)
                const { m: mb } = parsePeriod(b.data.identificacao.periodoApuracao)
                return ma - mb
            })

            filesForYear.forEach(f => {
                const { m } = parsePeriod(f.data.identificacao.periodoApuracao)
                const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
                labels.push(monthNames[m - 1])
                revenue.push(f.data.receitas.receitaPA || 0)
                taxes.push(f.data.tributos.Total || 0)
            })

            map.set(y, { labels, revenue, taxes })
        })
        return map
    }, [years, sortedFiles])

    // Aggregated Data for Comparison
    const aggregatedComparisonData = useMemo(() => {
        if (granularity === 'monthly') return null

        // Label Mapping
        let labels: string[] = []
        let bucketCount = 0

        if (granularity === 'quarterly') {
            labels = ['1º Trim', '2º Trim', '3º Trim', '4º Trim']
            bucketCount = 4
        } else if (granularity === 'semiannual') {
            labels = ['1º Semestre', '2º Semestre']
            bucketCount = 2
        } else if (granularity === 'annual') {
            labels = ['Total Anual']
            bucketCount = 1
        }

        const datasets: any[] = []
        const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'] // Blue, Green, Amber, Violet, Pink, Indigo

        years.forEach((y, idx) => {
            const data = new Array(bucketCount).fill(0)

            sortedFiles.forEach(f => {
                const { m, y: fy } = parsePeriod(f.data.identificacao.periodoApuracao)
                if (fy !== y) return
                const val = f.data.receitas.receitaPA || 0

                if (granularity === 'quarterly') {
                    const q = Math.ceil(m / 3) - 1
                    if (q >= 0 && q < 4) data[q] += val
                } else if (granularity === 'semiannual') {
                    const s = m <= 6 ? 0 : 1
                    data[s] += val
                } else {
                    data[0] += val
                }
            })

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
    }, [granularity, years, sortedFiles])


    // Calculate totals for consolidated view
    const totalRevenue = sortedFiles.reduce((acc, file) => acc + (file.data.receitas.receitaPA || 0), 0)
    const averageRevenue = sortedFiles.length > 0 ? totalRevenue / sortedFiles.length : 0
    const totalTaxes = sortedFiles.reduce((acc, file) => acc + (file.data.tributos.Total || 0), 0)
    const averageTaxes = sortedFiles.length > 0 ? totalTaxes / sortedFiles.length : 0
    const averageTaxRate = totalRevenue > 0 ? (totalTaxes / totalRevenue) * 100 : 0

    // Chart Options Boilerplate
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
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

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle>Comparativo Temporal</CardTitle>
                                        <div className="flex bg-muted rounded-md p-1 gap-1">
                                            {(['quarterly', 'semiannual', 'annual'] as const).map((m) => (
                                                <button
                                                    key={m}
                                                    onClick={() => setGranularity(m)}
                                                    className={cn(
                                                        "px-3 py-1 text-xs font-medium rounded-sm transition-all",
                                                        granularity === m
                                                            ? "bg-background text-foreground shadow-sm"
                                                            : "text-muted-foreground hover:bg-background/50"
                                                    )}
                                                >
                                                    {m === 'quarterly' && 'Trimestral'}
                                                    {m === 'semiannual' && 'Semestral'}
                                                    {m === 'annual' && 'Anual'}
                                                </button>
                                            ))}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="h-[350px]">
                                        {granularity !== 'monthly' && aggregatedComparisonData && (
                                            <Bar
                                                options={chartOptions}
                                                data={aggregatedComparisonData as ChartData<"bar">}
                                            />
                                        )}
                                    </CardContent>
                                </Card>

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
                                                        position: 'top',
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
                            <div className="mt-4 flex justify-end">
                                <Button variant="secondary" onClick={() => setShowErrorModal(false)}>Fechar</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
