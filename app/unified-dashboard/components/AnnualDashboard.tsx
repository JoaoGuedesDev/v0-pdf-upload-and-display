'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useTheme } from "next-themes"
import { MonthlyFile } from '../types'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ArrowLeft, Download, AlertTriangle, CheckCircle, FileText, ChevronRight, BarChart3, LayoutDashboard, Upload, X } from "lucide-react"
import { Line } from 'react-chartjs-2'
import { cn } from "@/lib/utils"
import { PGDASDProcessor } from '@/components/pgdasd-processor'
import { HeaderLogo } from "@/components/header-logo"
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
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface AnnualDashboardProps {
  files: MonthlyFile[]
  onBack?: () => void
}

export function AnnualDashboard({ files, onBack }: AnnualDashboardProps) {
  const [localFiles, setLocalFiles] = useState<MonthlyFile[]>(files)
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null)
  const [chartImage, setChartImage] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  const [showErrorModal, setShowErrorModal] = useState(false)
  
  const chartRef = useRef<any>(null)
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
            setLocalFiles(prev => [...prev, ...validFiles])
        }

    } catch (err: any) {
        setUploadErrors([err.message || "Erro ao processar arquivos"])
        setShowErrorModal(true)
    } finally {
        setIsUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }
  
  const isDark = theme === 'dark'
  const chartTheme = useMemo(() => ({
      grid: isDark ? '#334155' : '#e2e8f0',
      text: isDark ? '#94a3b8' : '#64748b',
      tooltipBg: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      tooltipTitle: isDark ? '#f1f5f9' : '#1e293b',
      tooltipBody: isDark ? '#cbd5e1' : '#475569',
      tooltipBorder: isDark ? '#475569' : '#e2e8f0'
  }), [isDark])

  // Consolidation Logic
  // Robust calculation using for-loop to handle potential type mismatches
  let totalRevenue = 0
  let totalTaxes = 0
  
  localFiles.forEach(f => {
      const rec = f.data?.receitas?.receitaPA
      const tax = f.data?.tributos?.Total
      
      // Handle number or string
      if (typeof rec === 'number') totalRevenue += rec
      else if (typeof rec === 'string') totalRevenue += Number(rec) || 0
      
      if (typeof tax === 'number') totalTaxes += tax
      else if (typeof tax === 'string') totalTaxes += Number(tax) || 0
  })

  const averageTaxes = totalTaxes / (localFiles.length || 1)
  
  useEffect(() => {
    console.log('[AnnualDashboard] Files received:', localFiles.length)
    if (localFiles.length > 0) {
        console.log('[AnnualDashboard] First file sample:', localFiles[0])
        console.log('[AnnualDashboard] Calculated Revenue:', totalRevenue)
    }
  }, [localFiles, totalRevenue])
  
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

  const labels = sortedFiles.map(f => {
      const p = f.data?.identificacao?.periodoApuracao || ''
      if (!p) return '?'
      const parts = p.split(' ')[0].split('/')
      if (parts.length === 2) return `${parts[0]}/${parts[1]}`
      if (parts.length === 3) return `${parts[1]}/${parts[2]}`
      return p
  })
  
  const revenueData = sortedFiles.map(f => f.data?.receitas?.receitaPA || 0)
  const taxData = sortedFiles.map(f => f.data?.tributos?.Total || 0)

  const lineChartData = useMemo(() => ({
    labels,
    datasets: [
      {
        label: 'Faturamento Bruto',
        data: revenueData,
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Impostos Pagos',
        data: taxData,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        fill: true,
        tension: 0.4
      }
    ]
  }), [labels, revenueData, taxData])

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false
        },
        tooltip: {
            mode: 'index' as const,
            intersect: false,
            backgroundColor: chartTheme.tooltipBg,
            titleColor: chartTheme.tooltipTitle,
            bodyColor: chartTheme.tooltipBody,
            borderColor: chartTheme.tooltipBorder,
            borderWidth: 1,
            padding: 12,
            callbacks: {
                label: function(context: any) {
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
        y: {
            beginAtZero: true,
            grid: {
                color: chartTheme.grid
            },
            ticks: {
                callback: function(value: any) {
                    return new Intl.NumberFormat('pt-BR', {
                        notation: "compact",
                        compactDisplay: "short",
                        maximumFractionDigits: 1
                    }).format(Number(value));
                },
                color: chartTheme.text
            }
        },
        x: {
            grid: {
                display: false
            },
            ticks: {
                color: chartTheme.text
            }
        }
    },
    animation: {
        onComplete: (animation: any) => {
            const chart = animation.chart;
            // Use a timeout to ensure rendering is fully complete
            setTimeout(() => {
                 // Safety check: verify if chart is still valid and has a canvas
                 if (!chart || !chart.canvas) return;

                 try {
                     const newImage = chart.toBase64Image();
                     setChartImage(prev => {
                         if (prev !== newImage) return newImage;
                         return prev;
                     });
                 } catch (e) {
                     // Silent fail if image generation fails
                     console.debug('Failed to generate chart image for print:', e);
                 }
            }, 0);
        }
    }
  }), [chartTheme])

  const discrepancies = sortedFiles.filter(f => {
      const declared = f.data?.valorTotalDAS || 0
      const calculated = f.data?.tributos?.Total || 0
      return Math.abs(declared - calculated) > 0.05 // Tolerance
  })

  // Determine if we are showing a specific file or the consolidated view
  const isConsolidated = selectedFileIndex === null
  const currentFile = selectedFileIndex !== null ? sortedFiles[selectedFileIndex] : null

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background">
      
      {/* Main Content Area */}
      <div className="flex-1 order-2 lg:order-1 min-w-0">
         {isConsolidated ? (
            <div className="container mx-auto p-6 space-y-8">
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between print:hidden">
                    <div className="flex items-center gap-4">
                        {onBack && (
                        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2 hover:bg-muted">
                            <ArrowLeft className="h-4 w-4" />
                            Voltar
                        </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <input 
                            type="file" 
                            multiple 
                            accept=".pdf" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
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
                        <Button variant="outline" className="flex items-center gap-2" onClick={() => window.print()}>
                            <Download className="h-4 w-4" />
                            Exportar Relatório PDF
                        </Button>
                    </div>
                    </div>

                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-card p-6 rounded-lg shadow-sm border border-border">
                        <div className="flex items-center gap-4">
                            <div className="relative h-16 w-48">
                                <HeaderLogo className="h-full w-full object-left" />
                            </div>
                            <div className="h-12 w-px bg-border hidden md:block"></div>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">Relatório Anual Consolidado</h1>
                                <p className="text-sm text-muted-foreground">Visão estratégica e análise de tendências ({localFiles.length} meses processados)</p>
                            </div>
                        </div>
                        
                            {sortedFiles.length > 0 && (
                            <div className="mt-4 md:mt-0 text-right">
                                <div className="text-sm font-medium text-foreground">{sortedFiles[0].data?.identificacao?.razaoSocial || 'Razão Social Não Identificada'}</div>
                                <div className="text-xs text-muted-foreground">CNPJ: {sortedFiles[0].data?.identificacao?.cnpj || 'N/A'}</div>
                                <div className="text-xs text-blue-700 dark:text-blue-300 mt-1 badge badge-outline inline-block px-2 py-0.5 bg-blue-500/10 dark:bg-blue-900/30 rounded-full border border-blue-200 dark:border-blue-800">
                                    {localFiles.length} competências analisadas
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Faturamento Total Anual</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-foreground">
                        {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <div className="flex items-center mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <span className="bg-emerald-500/10 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            Receita Bruta Acumulada
                        </span>
                        </div>
                    </CardContent>
                    </Card>
                    <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Impostos Pagos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                        {totalTaxes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <div className="flex items-center mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
                            <span className="bg-red-500/10 dark:bg-red-900/30 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800">
                                {(totalTaxes / totalRevenue * 100).toFixed(2)}% do Faturamento
                            </span>
                        </div>
                    </CardContent>
                    </Card>
                    <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Média Mensal de Impostos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {averageTaxes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <div className="flex items-center mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                            <span className="bg-blue-500/10 dark:bg-blue-900/30 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                                Base: {localFiles.length} meses
                            </span>
                        </div>
                    </CardContent>
                    </Card>
                </div>

                {/* Main Chart */}
                <Card className="p-6 border-border shadow-sm">
                    <CardHeader className="px-0 pt-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl text-foreground">Evolução Financeira</CardTitle>
                            <CardDescription>Comparativo mensal de Faturamento vs Impostos</CardDescription>
                        </div>
                        <div className="flex gap-2 text-sm">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-[rgb(53,162,235)] rounded-full"></div>
                                <span className="text-muted-foreground">Faturamento</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-[rgb(255,99,132)] rounded-full"></div>
                                <span className="text-muted-foreground">Impostos</span>
                            </div>
                        </div>
                    </div>
                    </CardHeader>
                    <CardContent className="h-[400px] px-0 relative">
                    <div className="w-full h-full print:hidden">
                        <Line 
                            ref={chartRef}
                            data={lineChartData} 
                            options={chartOptions} 
                        />
                    </div>
                    {chartImage && (
                        <div className="hidden print:block w-full h-full flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                                src={chartImage} 
                                alt="Gráfico de Evolução Financeira" 
                                className="max-w-full max-h-full object-contain" 
                            />
                        </div>
                    )}
                    </CardContent>
                </Card>

                {/* Detailed Table */}
                <Card className="border-border shadow-sm overflow-hidden">
                    <CardHeader className="bg-muted/50 border-b border-border">
                    <CardTitle className="text-lg text-foreground">Detalhamento Mensal</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50 border-border">
                            <TableHead className="font-semibold text-muted-foreground">Período</TableHead>
                            <TableHead className="font-semibold text-muted-foreground text-right">Faturamento</TableHead>
                            <TableHead className="font-semibold text-muted-foreground text-right">Impostos</TableHead>
                            <TableHead className="font-semibold text-muted-foreground text-right">Alíquota Efetiva</TableHead>
                            <TableHead className="font-semibold text-muted-foreground text-center">Status</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {sortedFiles.map((file, index) => {
                            const fat = file.data?.receitas?.receitaPA || 0
                            const imp = file.data?.tributos?.Total || 0
                            const aliq = fat > 0 ? (imp / fat) * 100 : 0
                            const hasDiscrepancy = Math.abs((file.data?.valorTotalDAS || 0) - imp) > 0.05
                            
                            return (
                            <TableRow 
                                key={file.filename} 
                                className={cn(
                                    "cursor-pointer transition-colors border-border",
                                    index % 2 === 0 ? 'bg-card' : 'bg-muted/20',
                                    "hover:bg-muted/50"
                                )}
                                onClick={() => setSelectedFileIndex(index)}
                            >
                                <TableCell className="font-medium text-foreground flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                    {file.data?.identificacao?.periodoApuracao || 'N/A'}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">{fat.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                <TableCell className="text-right text-red-600 dark:text-red-400 font-medium">{imp.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{aliq.toFixed(2)}%</TableCell>
                                <TableCell className="text-center">
                                    {hasDiscrepancy ? (
                                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                            Divergência
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Validado
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                            )
                        })}
                        </TableBody>
                    </Table>
                    </CardContent>
                </Card>

                {/* Discrepancies Section */}
                {discrepancies.length > 0 && (
                    <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
                    <CardHeader>
                        <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            Alertas de Discrepância
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {discrepancies.map(f => (
                                <div key={f.filename} className="flex justify-between items-center text-sm p-2 bg-white dark:bg-card rounded border border-red-100 dark:border-red-800/50">
                                    <span className="font-medium text-foreground">{f.data.identificacao.periodoApuracao}</span>
                                    <div className="flex gap-4 text-muted-foreground">
                                        <span>Declarado: {f.data.valorTotalDAS.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                        <span>Calculado: {f.data.tributos.Total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                        <span className="font-bold text-red-600 dark:text-red-400">
                                            Diff: {(f.data.valorTotalDAS - f.data.tributos.Total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                    </Card>
                )}
            </div>
         ) : (
             <div className="min-h-screen">
                <PGDASDProcessor 
                    initialData={currentFile?.data} 
                    hideDownloadButton={true} 
                    isOwner={true} // Allow full view
                />
             </div>
         )}
      </div>

      {/* Right Sidebar */}
      <div className="w-full lg:w-80 border-l border-border bg-card order-1 lg:order-2 lg:h-screen lg:sticky lg:top-0 overflow-y-auto print:hidden">
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
                        label = `${months[m-1]} ${y}`
                    }
                } catch {}

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
