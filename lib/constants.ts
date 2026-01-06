/**
 * Constantes e configurações globais do projeto
 * Centraliza valores reutilizáveis para manter consistência
 */

// Cores padrão para gráficos
export const CHART_COLORS = [
  '#007AFF', // Azul Elétrico
  '#00C2FF', // Ciano Vibrante
  '#3D5AFE', // Indigo
  '#2962FF', // Azul Real
  '#00E5FF', // Ciano Brilhante
  '#050B14', // Fundo Escuro
] as const;

// Cores para atividades
export const ATIVIDADES_COLORS = {
  mercadorias: '#007AFF', // Azul Elétrico
  servicos: '#00C2FF', // Ciano Vibrante
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
      backgroundColor: '#0F1C36', // Azul petróleo rico
      titleColor: '#FFFFFF', // Branco puro
      bodyColor: '#00C2FF', // Ciano vibrante
      borderColor: '#007AFF', // Azul elétrico
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
        color: 'rgba(0, 194, 255, 0.2)', // Ciano translúcido
      },
    },
  },
} as const;