/**
 * Constantes e configurações globais do projeto
 * Centraliza valores reutilizáveis para manter consistência
 */

// Cores padrão para gráficos
export const CHART_COLORS = [
  '#8b5cf6', // violet-500
  '#d946ef', // fuchsia-500
  '#6366f1', // indigo-500
  '#a855f7', // purple-500
  '#ec4899', // pink-500
  '#7c3aed', // violet-600
  '#c084fc', // purple-400
  '#e879f9', // fuchsia-400
] as const;

// Cores para atividades
export const ATIVIDADES_COLORS = {
  mercadorias: '#7c3aed', // violet-600
  servicos: '#d946ef', // fuchsia-500
} as const;

// Configurações de UI
export const UI_CONFIG = {
  dims: {
    receitaMensalHeight: 320,
  },
  fonts: {
    titleCls: 'text-lg font-semibold',
    descCls: 'text-sm',
  },
} as const;

// Configurações de PDF
export const PDF_CONFIG = {
  margin: { top: 25, right: 10, bottom: 20, left: 10 }, // mm
  width: 1920, // px
  height: 1080, // px
  timeout: 1000, // ms
} as const;

// Mensagens de erro padronizadas
export const ERROR_MESSAGES = {
  INVALID_ID: 'ID inválido ou expirado',
  MISSING_DATA: 'Dados não encontrados',
  PDF_GENERATION_FAILED: 'Falha na geração do PDF',
  UPLOAD_FAILED: 'Falha no upload do arquivo',
  PROCESSING_FAILED: 'Falha no processamento',
} as const;

// URLs e endpoints
export const ENDPOINTS = {
  PDF_GENERATION: '/api/pdf',
  UPLOAD: '/api/upload',
  PROCESS_PDF: '/api/process-pdf',
  INSIGHTS: '/api/insights',
} as const;

// Configurações de gráficos
export const CHART_CONFIG = {
  animationDuration: 300,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        padding: 20,
        usePointStyle: true,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(46, 16, 101, 0.95)', // purple-950
      titleColor: '#faf5ff', // purple-50
      bodyColor: '#faf5ff', // purple-50
      borderColor: '#7c3aed', // violet-600
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(233, 213, 255, 0.5)', // purple-200
      },
    },
  },
} as const;