'use client';

import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  ChartDataLabels
);

interface TributoData {
  nome: string;
  valor: number;
  baseCalculo: number;
  aliquota: number;
  percentual: number;
}

interface DashboardData {
  empresa: string;
  cnpj: string;
  periodo: string;
  anexoFaixa: string;
  municipioUF: string;
  faturamentoBruto: number;
  totalTributos: number;
  aliquotaNominal: number;
  aliquotaEfetiva: number;
  margemLiquida: number | null;
  tributos: TributoData[];
  faturamentoMensal: { mes: string; valor: number }[];
}

const mockData: DashboardData = {
  empresa: "EMPRESA EXEMPLO LTDA",
  cnpj: "12.345.678/0001-90",
  periodo: "Janeiro/2024",
  anexoFaixa: "Anexo III – 4ª faixa",
  municipioUF: "São Paulo/SP",
  faturamentoBruto: 285000,
  totalTributos: 45600,
  aliquotaNominal: 16.0,
  aliquotaEfetiva: 16.0,
  margemLiquida: 12.5,
  tributos: [
    { nome: "IRPJ", valor: 8550, baseCalculo: 285000, aliquota: 3.0, percentual: 18.75 },
    { nome: "CSLL", valor: 7125, baseCalculo: 285000, aliquota: 2.5, percentual: 15.63 },
    { nome: "COFINS", valor: 9975, baseCalculo: 285000, aliquota: 3.5, percentual: 21.88 },
    { nome: "PIS/Pasep", valor: 2850, baseCalculo: 285000, aliquota: 1.0, percentual: 6.25 },
    { nome: "INSS/CPP", valor: 12825, baseCalculo: 285000, aliquota: 4.5, percentual: 28.12 },
    { nome: "ICMS", valor: 4275, baseCalculo: 285000, aliquota: 1.5, percentual: 9.38 },
    { nome: "IPI", valor: 0, baseCalculo: 285000, aliquota: 0.0, percentual: 0.0 },
    { nome: "ISS", valor: 0, baseCalculo: 285000, aliquota: 0.0, percentual: 0.0 },
  ],
  faturamentoMensal: [
    { mes: "Jan", valor: 285000 },
    { mes: "Fev", valor: 320000 },
    { mes: "Mar", valor: 295000 },
    { mes: "Abr", valor: 310000 },
    { mes: "Mai", valor: 275000 },
    { mes: "Jun", valor: 285000 },
  ]
};

const coresTributos = [
  '#3B82F6', // Azul
  '#10B981', // Verde
  '#F59E0B', // Amarelo
  '#EF4444', // Vermelho
  '#8B5CF6', // Roxo
  '#06B6D4', // Ciano
  '#84CC16', // Verde limão
  '#F97316', // Laranja
];

export default function DashboardDAS() {
  const dashboardRef = useRef<HTMLDivElement>(null);

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const formatarPercentual = (valor: number) => {
    return `${valor.toFixed(2)}%`;
  };

  const gerarPDF = async () => {
    if (!dashboardRef.current) return;

    try {
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save('dashboard-das.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    }
  };

  const dadosDoughnut = {
    labels: mockData.tributos.map(t => t.nome),
    datasets: [
      {
        data: mockData.tributos.map(t => t.valor),
        backgroundColor: coresTributos,
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const opcoesDoughnut = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          generateLabels: (chart) => {
            const data = chart.data;
            return data.labels?.map((label, i) => {
              const valor = data.datasets[0].data[i];
              const percentual = mockData.tributos[i].percentual;
              return {
                text: `${label} – ${formatarMoeda(valor)} (${percentual.toFixed(1)}%)`,
                fillStyle: data.datasets[0].backgroundColor[i],
                hidden: false,
                index: i,
              };
            }) || [];
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const valor = context.parsed;
            const percentual = mockData.tributos[context.dataIndex].percentual;
            return `${context.label}: ${formatarMoeda(valor)} (${percentual.toFixed(1)}%)`;
          },
        },
      },
    },
  };

  const dadosBar = {
    labels: mockData.tributos.map(t => t.nome),
    datasets: [
      {
        label: 'Valor do Tributo',
        data: mockData.tributos.map(t => t.valor),
        backgroundColor: coresTributos,
        borderWidth: 1,
        borderColor: '#ffffff',
      },
    ],
  };

  const opcoesBar = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      datalabels: {
        anchor: 'end' as const,
        align: 'top' as const,
        formatter: (value: number) => formatarMoeda(value),
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number) => formatarMoeda(value),
        },
      },
    },
  };

  const dadosLine = {
    labels: mockData.faturamentoMensal.map(m => m.mes),
    datasets: [
      {
        label: 'Faturamento Mensal',
        data: mockData.faturamentoMensal.map(m => m.valor),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const opcoesLine = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `${context.parsed.y.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number) => formatarMoeda(value),
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-end mb-4">
          <button
            onClick={gerarPDF}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Gerar PDF
          </button>
        </div>

        <div ref={dashboardRef} className="bg-white rounded-lg shadow-lg p-8">
          {/* Cabeçalho */}
          <div className="border-b border-gray-200 pb-6 mb-6">
            <div className="flex justify-between items-center">
              <div className="text-gray-500 font-medium">LOGO ESCRITÓRIO</div>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Dashboard da DAS – Resumo Tributário
                </h1>
                <p className="text-gray-600">
                  Visualização simplificada dos impostos e do faturamento com base na DAS do Simples Nacional.
                </p>
              </div>
              <div className="text-gray-500 font-medium">LOGO CLIENTE</div>
            </div>
          </div>

          {/* Informações do Contribuinte */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="mb-3">
                  <span className="text-sm font-medium text-gray-600">Razão social da empresa:</span>
                  <div className="text-lg font-semibold text-gray-900">{mockData.empresa}</div>
                </div>
                <div className="mb-3">
                  <span className="text-sm font-medium text-gray-600">CNPJ:</span>
                  <div className="text-lg font-semibold text-gray-900">{mockData.cnpj}</div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Período de apuração:</span>
                  <div className="text-lg font-semibold text-gray-900">{mockData.periodo}</div>
                </div>
              </div>
              <div>
                <div className="mb-3">
                  <span className="text-sm font-medium text-gray-600">Regime:</span>
                  <div className="text-lg font-semibold text-gray-900">Simples Nacional</div>
                </div>
                <div className="mb-3">
                  <span className="text-sm font-medium text-gray-600">Anexo / Faixa:</span>
                  <div className="text-lg font-semibold text-gray-900">{mockData.anexoFaixa}</div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Município/UF:</span>
                  <div className="text-lg font-semibold text-gray-900">{mockData.municipioUF}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Cards de KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-sm font-medium text-gray-600 mb-1">Faturamento bruto do período</div>
              <div className="text-2xl font-bold text-blue-600">{formatarMoeda(mockData.faturamentoBruto)}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-sm font-medium text-gray-600 mb-1">Total de tributos</div>
              <div className="text-2xl font-bold text-red-600">{formatarMoeda(mockData.totalTributos)}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-sm font-medium text-gray-600 mb-1">Alíquota nominal</div>
              <div className="text-2xl font-bold text-green-600">{formatarPercentual(mockData.aliquotaNominal)}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-sm font-medium text-gray-600 mb-1">Alíquota efetiva</div>
              <div className="text-2xl font-bold text-purple-600">{formatarPercentual(mockData.aliquotaEfetiva)}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-sm font-medium text-gray-600 mb-1">Margem líquida estimada</div>
              <div className="text-2xl font-bold text-orange-600">
                {mockData.margemLiquida ? formatarPercentual(mockData.margemLiquida) : '–'}
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição dos Tributos na DAS</h3>
              <div className="h-80">
                <Doughnut data={dadosDoughnut} options={opcoesDoughnut} />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Valor dos Tributos (R$)</h3>
              <div className="h-80">
                <Bar data={dadosBar} options={opcoesBar} />
              </div>
            </div>
          </div>

          {/* Gráfico de Linha */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolução do Faturamento</h3>
            <div className="h-64">
              <Line data={dadosLine} options={opcoesLine} />
            </div>
          </div>

          {/* Tabela de Tributos */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo dos Tributos</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Tributo</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Base de cálculo (R$)</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Alíquota aplicada (%)</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Valor do tributo (R$)</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Percentual sobre o total de tributos (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {mockData.tributos.map((tributo, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-3 px-4 font-medium">{tributo.nome}</td>
                      <td className="py-3 px-4 text-right">{formatarMoeda(tributo.baseCalculo)}</td>
                      <td className="py-3 px-4 text-right">{formatarPercentual(tributo.aliquota)}</td>
                      <td className="py-3 px-4 text-right">{formatarMoeda(tributo.valor)}</td>
                      <td className="py-3 px-4 text-right">{formatarPercentual(tributo.percentual)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="py-3 px-4">TOTAL</td>
                    <td className="py-3 px-4 text-right">{formatarMoeda(mockData.faturamentoBruto)}</td>
                    <td className="py-3 px-4 text-right">–</td>
                    <td className="py-3 px-4 text-right">{formatarMoeda(mockData.totalTributos)}</td>
                    <td className="py-3 px-4 text-right">100,00%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Rodapé */}
          <div className="text-sm text-gray-600 border-t border-gray-200 pt-4">
            <p>Emitido em {new Date().toLocaleDateString('pt-BR')} com base nas informações constantes na DAS do Simples Nacional.</p>
          </div>
        </div>
      </div>
    </div>
  );
}