/**
 * Componente de gráfico de receita mensal
 * Exibe evolução de receitas com Chart.js
 */

import { useMemo, memo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import ChartDataLabels, { Context } from 'chartjs-plugin-datalabels';
import { CHART_CONFIG } from '@/lib/constants';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

interface GraficoReceitaMensalProps {
  data: {
    labels: string[];
    values: number[];
    externo?: {
      labels: string[];
      values: number[];
    };
  } | null | undefined;
  title?: string;
  description?: string;
  height?: number;
}

export const GraficoReceitaMensal = memo(function GraficoReceitaMensal({ 
  data, 
  title = '',
  description = 'Evolução de Receitas',
  height = 370 
}: GraficoReceitaMensalProps) {
  const chartData = (() => {
    if (!data || !data.labels || !data.values) {
      return { labels: [], datasets: [] };
    }
    const parseNumber = (v: any): number => {
      if (typeof v === "number") return v
      if (typeof v === "string") {
        const s = v.trim()
        if (!s) return 0
        // Trata formato "1.234,56" ou "1,234.56"
        const hasComma = s.includes(",")
        const hasDot = s.includes(".")
        let cleaned = s
        if (hasComma && hasDot) {
          // Se tem ambos, remove o que vier primeiro (milhar) e troca o último (decimal)
          const lastDot = s.lastIndexOf('.')
          const lastComma = s.lastIndexOf(',')
          if (lastComma > lastDot) {
            cleaned = s.replace(/\./g, "").replace(",", ".") // Formato BR: 1.234,56
          } else {
            cleaned = s.replace(/,/g, "") // Formato US: 1,234.56
          }
        } else if (hasComma) {
          cleaned = s.replace(",", ".") // Apenas vírgula como decimal
        }
        const n = Number(cleaned)
        return isFinite(n) ? n : 0
      }
      const n = Number(v)
      return isFinite(n) ? n : 0
    }

    const baseValues = data.values.map(parseNumber);
    const externoValues = data.externo?.values?.map(parseNumber) || [];
    
    const labelsAll = data.labels;
    const internaAll = baseValues.map(v => v === 0 ? 0 : v);
    const externaAll = externoValues.map(v => (v || 0) === 0 ? 0 : v);

    const idxs = labelsAll.map((_, i) => i).filter(i => {
      const bi = Number(internaAll[i] ?? 0)
      const be = Number(externaAll[i] ?? 0)
      return (bi > 0) || (be > 0)
    })
    const TH = 0.0001
    const labels = idxs.map(i => labelsAll[i])
    const internaData = idxs.map(i => {
      const v = Number(internaAll[i] ?? 0)
      return v > TH ? v : null
    })
    const externaData = idxs.map(i => {
      const v = Number(externaAll[i] ?? 0)
      return v > TH ? v : null
    })

    const monthIndex = (m: string) => {
      const map: Record<string, number> = {
        jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
        jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
      }
      const k = String(m || '').trim().slice(0,3).toLowerCase()
      return map[k] || 0
    }
    const labelToKey = (s: string, i: number) => {
      const mmYYYY = s.match(/^(\d{1,2})\/(\d{4})$/)
      if (mmYYYY) {
        const mm = Number(mmYYYY[1])
        const yy = Number(mmYYYY[2])
        return yy * 100 + mm
      }
      const yDashM = s.match(/^(\d{4})-(\d{1,2})$/)
      if (yDashM) {
        const yy = Number(yDashM[1])
        const mm = Number(yDashM[2])
        return yy * 100 + mm
      }
      const monYear = s.match(/^([A-Za-zÀ-ÿ]{3,})\s*\/?\s*(\d{4})$/)
      if (monYear) {
        const mm = monthIndex(monYear[1])
        const yy = Number(monYear[2])
        return yy * 100 + mm
      }
      const mm = monthIndex(s)
      if (mm > 0) return 2000 * 100 + mm
      return i
    }
    const items = labels.map((l, i) => ({
      label: l,
      ext: Number(externaData[i] ?? 0) || 0,
      int: Number(internaData[i] ?? 0) || 0,
      key: labelToKey(l, i),
    }))
    const sorted = items.sort((a, b) => a.key - b.key)
    const labelsSorted = sorted.map(it => it.label)
    const externaSorted = sorted.map(it => {
      const v = it.ext
      return v > TH ? v : null
    })
    const internaSorted = sorted.map(it => {
      const v = it.int
      return v > TH ? v : null
    })

    const datasets = [
      {
        label: 'Mercado Externo',
        data: externaSorted,
        backgroundColor: '#a183f573',
        borderColor: '#000000ff',
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
        maxBarThickness: 24,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
        stack: 'receita',
      },
      {
        label: 'Mercado Interno',
        data: internaSorted,
        backgroundColor: '#61a0f1ff',
        borderColor: '#200466ff',
        borderWidth: 0,
        borderRadius: 99,
        borderSkipped: false,
        maxBarThickness: 24,
        barPercentage: .6,
        categoryPercentage: 0.7,
        stack: 'receita',
      },
    ]

    return { labels: labelsSorted, datasets };
  })();

  const options: ChartOptions<'bar'> = ({
    ...CHART_CONFIG,
    animation: false,
    layout: { padding: { top: 70, bottom: -7 } },
    plugins: {
      ...CHART_CONFIG.plugins,
      legend: {
        ...CHART_CONFIG.plugins.legend,
        display: true,
        onClick: (evt: any, item: any, legend: any) => {
          const chart = legend?.chart
          const idx = typeof item?.datasetIndex === 'number' ? item.datasetIndex : -1
          if (!chart || idx < 0) return
          const ds = chart.data?.datasets?.[idx] as any
          if (!ds) return
          ds.hidden = !!ds.hidden ? false : true
          try {
            chart.update()
          } catch (_) {
            // no-op: evita quebra caso animações não estejam resolvidas
          }
        },
        labels: {
          ...CHART_CONFIG.plugins.legend.labels,
          generateLabels: (chart) => {
            const getHidden = (i: number) => {
              const ds: any = chart.data?.datasets?.[i]
              return !!(ds && ds.hidden)
            }
            return [
              { text: 'Mercado Externo', fillStyle: '#8b5cf6', strokeStyle: '#8b5cf6', hidden: getHidden(0), datasetIndex: 0 },
              { text: 'Mercado Interno', fillStyle: '#3b82f6', strokeStyle: '#3b82f6', hidden: getHidden(1), datasetIndex: 1 },
            ] as any
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = String(context.dataset?.label || '')
            const val = Number(context.parsed?.y ?? context.raw ?? 0)
            const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
            return `${label}: ${fmt}`
          },
          afterBody: (items: any[]) => {
            if (!items?.length) return ''
            const chart = items[0].chart
            const i = items[0].dataIndex
            const ds = chart?.data?.datasets as any[]
            const total = Number(ds?.[0]?.data?.[i] || 0) + Number(ds?.[1]?.data?.[i] || 0)
            const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)
            return `Total: ${fmt}`
          },
        },
      },
      datalabels: {
        clamp: true,
        clip: false,
        offset: 4,
        anchor: 'end',
        align: 'end',
        rotation: -45,
        color: (ctx: Context) => {
          const isExterno = (ctx?.datasetIndex ?? 0) === 0
          if (isExterno) return '#200466ff'
          return '#0e0e0fff'
        },
        font: { size: 10, weight: 'bold' },
        formatter: (value: unknown, ctx: Context) => {
          const i = ctx?.dataIndex ?? 0
          const chart = ctx.chart
          const ds = chart?.data?.datasets as any[]
          const isExterno = (ctx?.datasetIndex ?? 0) === 0
          const ext = Number(ds?.[0]?.data?.[i] || 0)
          const int = Number(ds?.[1]?.data?.[i] || 0)
          const val = isExterno ? ext : (ext + int)
          const TH = 0.01
          if (!isFinite(val) || val <= TH) return ''
          return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(val)
        },
        display: (ctx: Context) => {
          const i = ctx?.dataIndex ?? 0
          const chart = ctx.chart
          const labelsCount = chart?.data?.labels?.length ?? 0
          const areaWidth = chart?.chartArea ? (chart.chartArea.right - chart.chartArea.left) : 0
          const perBar = labelsCount > 0 ? areaWidth / labelsCount : areaWidth
          const minLabelWidth = 70
          const step = perBar > 0 ? Math.max(1, Math.ceil(minLabelWidth / perBar)) : 1

          const ds = chart?.data?.datasets as any[]
          const isExterno = (ctx?.datasetIndex ?? 0) === 0
          const ext = Number((ctx as any)?.raw ?? ds?.[0]?.data?.[i] ?? 0)
          const TH = 0.01
          if (isExterno) {
            return ext > TH
          }
          const int = Number(ds?.[1]?.data?.[i] ?? 0)
          const total = ext + int
          if (total <= TH) return false
          return true

          const meta = chart?.getDatasetMeta(ctx.datasetIndex)
          const el = meta?.data?.[i] as any
          const prev = meta?.data?.[i - 1] as any
          if (el && prev && Math.abs(Number(el.x) - Number(prev.x)) < 20) return false
          return true
        },
      },
      title: { display: false },
    },
    scales: {
      x: {
        ...CHART_CONFIG.scales.x,
        stacked: true,
        ticks: {
          color: '#111827',
          padding: 16,
        },
      },
      y: {
        ...CHART_CONFIG.scales.y,
        stacked: true,
        ticks: {
          color: '#111827',
          callback: function(value) {
            return 'R$ ' + new Intl.NumberFormat('pt-BR', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(Number(value));
          },
        },
      },
    },
  });

  if (!data || chartData.labels.length === 0) {
    return (
      <div className={`flex items-center justify-center h-[${height}px] text-slate-500`}>
        <div className="text-center">
          <div className="text-lg mb-2">📊</div>
          <div className="text-sm">Nenhum dado de receita disponível</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <Bar data={chartData} options={options} />
    </div>
  );
});