'use client'

import { MonthlyFile } from '../types'
import { useTheme } from "next-themes"
import { useState, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { DashboardActions } from './DashboardActions'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ChevronLeft, ChevronRight, ArrowLeft, X, AlertTriangle } from "lucide-react"
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

interface MonthlyViewProps {
  files: MonthlyFile[]
  currentIndex: number
  onNavigate: (index: number) => void
  onBack: () => void
  onFilesUpdated?: (files: MonthlyFile[]) => void
}

export function MonthlyView({ files, currentIndex, onNavigate, onBack, onFilesUpdated }: MonthlyViewProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [isUploading, setIsUploading] = useState(false)
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  const [showErrorModal, setShowErrorModal] = useState(false)

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
        const refCnpj = files[0]?.data?.identificacao?.cnpj
        const refCompany = files[0]?.data?.identificacao?.razaoSocial

        // Existing periods
        const existingPeriods = new Set(files.map(f => f.data?.identificacao?.periodoApuracao))

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
            const updated = [...files, ...validFiles]
            if (onFilesUpdated) {
                // Defer to avoid render loop issues
                setTimeout(() => onFilesUpdated(updated), 0)
            }
        }

    } catch (err: any) {
        setUploadErrors([err.message || "Erro ao processar arquivos"])
        setShowErrorModal(true)
    } finally {
        setIsUploading(false)
    }
  }

  const handleExportPdf = () => {
    const sorted = [...files].sort((a, b) => {
        const dateA = new Date(a.data?.identificacao?.periodoApuracao || '')
        const dateB = new Date(b.data?.identificacao?.periodoApuracao || '')
        return dateA.getTime() - dateB.getTime()
    })
    
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    // In Monthly View, we might not have a dashboardCode. 
    // We try to use the current URL logic but force annual PDF generation
    // OR we could try to export the current month?
    // Let's stick to consolidated annual for consistency with the button text "Relatório PDF" (which usually means the main report).
    
    // Fallback path logic
    let path = window.location.pathname + window.location.search
    
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

  const chartTheme = useMemo(() => ({
      grid: isDark ? '#1A2C4E' : '#e2e8f0', // Azul médio vibrante
      text: isDark ? '#FFFFFF' : '#64748b', // Branco puro
      tooltipBg: isDark ? 'rgba(5, 11, 20, 0.95)' : 'rgba(255, 255, 255, 0.95)', // Azul marinho profundo
      tooltipTitle: isDark ? '#FFFFFF' : '#1e293b',
      tooltipBody: isDark ? '#00C2FF' : '#475569', // Ciano vibrante
      tooltipBorder: isDark ? '#007AFF' : '#e2e8f0'
  }), [isDark])

  const file = files[currentIndex]
  const data = file.data

  const hasNext = currentIndex < files.length - 1
  const hasPrev = currentIndex > 0

  const taxes = data.tributos
  const taxLabels = Object.keys(taxes).filter(k => k !== 'Total' && taxes[k as keyof typeof taxes] > 0)
  const taxValues = taxLabels.map(k => taxes[k as keyof typeof taxes])

  const barData = useMemo(() => ({
    labels: ['Faturamento', 'Impostos', 'Líquido Estimado'],
    datasets: [
      {
        label: 'Valores (R$)',
        data: [
          data.receitas.receitaPA,
          data.tributos.Total,
          data.receitas.receitaPA - data.tributos.Total
        ],
        backgroundColor: [
          '#007AFF', // Azul elétrico vibrante
          '#3D5AFE', // Índigo vibrante
          '#00C2FF', // Ciano vibrante
        ],
        borderColor: [
          '#007AFF',
          '#3D5AFE',
          '#00C2FF',
        ],
        borderWidth: 1,
      },
    ],
  }), [data])

  const doughnutData = useMemo(() => ({
    labels: taxLabels,
    datasets: [
      {
        data: taxValues,
        backgroundColor: [
          '#007AFF', // Azul elétrico vibrante
          '#00C2FF', // Ciano vibrante
          '#3D5AFE', // Índigo vibrante
          '#2962FF', // Azul intenso
          '#00B0FF', // Azul claro vibrante
          '#00E5FF', // Ciano elétrico
        ],
        borderWidth: 1,
        borderColor: isDark ? '#050B14' : '#ffffff',
      },
    ],
  }), [taxLabels, taxValues, isDark])

  const barOptions = useMemo(() => ({
    responsive: true,
    plugins: {
        legend: { display: false },
        tooltip: {
            backgroundColor: chartTheme.tooltipBg,
            titleColor: chartTheme.tooltipTitle,
            bodyColor: chartTheme.tooltipBody,
            borderColor: chartTheme.tooltipBorder,
            borderWidth: 1,
        }
    },
    scales: {
        y: {
            grid: { color: chartTheme.grid },
            ticks: { color: chartTheme.text }
        },
        x: {
            grid: { display: false },
            ticks: { color: chartTheme.text }
        }
    }
  }), [chartTheme])

  const doughnutOptions = useMemo(() => ({
    responsive: true,
    plugins: {
        legend: { 
            position: 'bottom' as const,
            labels: { color: chartTheme.text }
        },
        tooltip: {
            backgroundColor: chartTheme.tooltipBg,
            titleColor: chartTheme.tooltipTitle,
            bodyColor: chartTheme.tooltipBody,
            borderColor: chartTheme.tooltipBorder,
            borderWidth: 1,
        }
    }
  }), [chartTheme])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="flex items-center gap-4">
          <DashboardActions 
            onUpload={handleFileUpload} 
            isUploading={isUploading} 
            onExportPdf={handleExportPdf}
            className="mr-2"
          />
          <Button
            variant="outline"
            size="icon"
            disabled={!hasPrev}
            onClick={() => onNavigate(currentIndex - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-lg min-w-[200px] text-center">
            {data.identificacao.periodoApuracao}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={!hasNext}
            onClick={() => onNavigate(currentIndex + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
            <DashboardActions 
                onUpload={handleFileUpload} 
                isUploading={isUploading} 
                onExportPdf={handleExportPdf}
            />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Faturamento Bruto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.receitas.receitaPAFormatada}</div>
            <p className="text-xs text-muted-foreground mt-1">
              RBT12: {data.receitas.rbt12.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Impostos Pagos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500 dark:text-red-400">
              {data.tributos.Total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(data.tributos.Total / data.receitas.receitaPA * 100).toFixed(2)}% do Faturamento
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Líquido Estimado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500 dark:text-green-400">
              {(data.receitas.receitaPA - data.tributos.Total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Receita - Impostos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-sm font-medium">Comparativo Faturamento vs Impostos</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <Bar data={barData} options={barOptions} />
                </div>
            </CardContent>
        </Card>
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-sm font-medium">Distribuição de Impostos</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full flex justify-center">
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Error Modal */}
      {showErrorModal && (
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
