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
import { CHART_CONFIG } from '@/lib/constants';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
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
  darkMode?: boolean;
  height?: number;
}

export const GraficoReceitaMensal = memo(function GraficoReceitaMensal({ 
  data, 
  title = 'Receita Mensal (R$)',
  description = 'Evolução de Receitas',
  darkMode = false,
  height = 320 
}: GraficoReceitaMensalProps) {
  const chartData = useMemo(() => {
    if (!data || !data.labels || !data.values) {
      return { labels: [], datasets: [] };
    }

    const baseValues = data.values.map(v => Number(v) || 0);
    const externoValues = data.externo?.values?.map(v => Number(v) || 0) || [];
    
    // Filtrar meses com valores zero
    const filteredIndices = data.labels.map((_, i) => {
      const baseValue = baseValues[i] || 0;
      const externoValue = externoValues[i] || 0;
      return baseValue > 0 || externoValue > 0 ? i : -1;
    }).filter(i => i !== -1);

    const labels = filteredIndices.map(i => data.labels[i]);
    const internaData = filteredIndices.map(i => baseValues[i] === 0 ? null : baseValues[i]);
    const externaData = filteredIndices.map(i => externoValues[i] === 0 ? null : (externoValues[i] || 0));

    const datasets = [
      {
        label: 'Receita Interna',
        data: internaData,
        backgroundColor: darkMode ? '#3b82f6' : '#3b82f6',
        borderColor: darkMode ? '#60a5fa' : '#2563eb',
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
      },
    ];

    if (externoValues.length > 0) {
      datasets.push({
        label: 'Receita Externa',
        data: externaData,
        backgroundColor: darkMode ? '#10b981' : '#10b981',
        borderColor: darkMode ? '#34d399' : '#059669',
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
      });
    }

    return { labels, datasets };
  }, [data, darkMode]);

  const options: ChartOptions<'bar'> = useMemo(() => ({
    ...CHART_CONFIG,
    plugins: {
      ...CHART_CONFIG.plugins,
      title: {
        display: !!title,
        text: title,
        color: darkMode ? '#f8fafc' : '#111827',
        font: {
          size: 14,
          weight: 'bold',
        },
      },
      legend: {
        ...CHART_CONFIG.plugins.legend,
        labels: {
          ...CHART_CONFIG.plugins.legend.labels,
          color: darkMode ? '#f8fafc' : '#111827',
        },
      },
    },
    scales: {
      x: {
        ...CHART_CONFIG.scales.x,
        ticks: {
          color: darkMode ? '#f8fafc' : '#111827',
        },
      },
      y: {
        ...CHART_CONFIG.scales.y,
        ticks: {
          color: darkMode ? '#f8fafc' : '#111827',
          callback: function(value) {
            return 'R$ ' + new Intl.NumberFormat('pt-BR', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(Number(value));
          },
        },
      },
    },
  }), [title, darkMode]);

  if (!data || chartData.labels.length === 0) {
    return (
      <div className={`flex items-center justify-center h-[${height}px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
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