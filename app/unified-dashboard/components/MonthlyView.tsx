'use client'

import { MonthlyFile } from '../types'
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react"
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
}

export function MonthlyView({ files, currentIndex, onNavigate, onBack }: MonthlyViewProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const chartTheme = useMemo(() => ({
      grid: isDark ? '#334155' : '#e2e8f0',
      text: isDark ? '#94a3b8' : '#64748b',
      tooltipBg: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      tooltipTitle: isDark ? '#f1f5f9' : '#1e293b',
      tooltipBody: isDark ? '#cbd5e1' : '#475569',
      tooltipBorder: isDark ? '#475569' : '#e2e8f0'
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
          'rgba(53, 162, 235, 0.5)',
          'rgba(255, 99, 132, 0.5)',
          'rgba(75, 192, 192, 0.5)',
        ],
        borderColor: [
          'rgb(53, 162, 235)',
          'rgb(255, 99, 132)',
          'rgb(75, 192, 192)',
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
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
        ],
        borderWidth: 1,
        borderColor: isDark ? '#1e293b' : '#ffffff',
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
        <div className="w-[100px]"></div> {/* Spacer for centering */}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Visão Geral do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Composição Tributária</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="w-[300px]">
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
