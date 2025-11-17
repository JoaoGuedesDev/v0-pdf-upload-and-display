// =============================================================================
// SISTEMA DE DESIGN CORPORATIVO - INTEGRA DAS
// =============================================================================

// -----------------------------------------------------------------------------
// PALETA CORPORATIVA (Sistema de cores profissional)
// -----------------------------------------------------------------------------
export const palette = {
  // Cores primárias (Identidade visual)
  primary: {
    50: "#f0f9ff",
    100: "#e0f2fe",
    200: "#bae6fd",
    300: "#7dd3fc",
    400: "#38bdf8",
    500: "#0ea5e9", // Primary Brand Blue
    600: "#0284c7",
    700: "#0369a1",
    800: "#075985",
    900: "#0c4a6e",
    950: "#082f49",
  },
  
  // Cores secundárias (Suporte e acentuação)
  secondary: {
    50: "#faf6ff",
    100: "#f3e8ff",
    200: "#e9d5ff",
    300: "#d8b4fe",
    400: "#c084fc",
    500: "#a855f7", // Secondary Purple
    600: "#9333ea",
    700: "#7c3aed",
    800: "#6b21a8",
    900: "#581c87",
    950: "#3b0764",
  },
  
  // Cores semânticas (Status e feedback)
  success: {
    50: "#f0fdf4",
    100: "#dcfce7",
    200: "#bbf7d0",
    300: "#86efac",
    400: "#4ade80",
    500: "#22c55e", // Success Green
    600: "#16a34a",
    700: "#15803d",
    800: "#166534",
    900: "#14532d",
    950: "#052e16",
  },
  
  warning: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b", // Warning Orange
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
    950: "#451a03",
  },
  
  error: {
    50: "#fef2f2",
    100: "#fee2e2",
    200: "#fecaca",
    300: "#fca5a5",
    400: "#f87171",
    500: "#ef4444", // Error Red
    600: "#dc2626",
    700: "#b91c1c",
    800: "#991b1b",
    900: "#7f1d1d",
    950: "#450a0a",
  },
  
  // Cores neutras (Texto e fundos)
  neutral: {
    50: "#fafafa",
    100: "#f4f4f5",
    200: "#e4e4e7",
    300: "#d4d4d8",
    400: "#a1a1aa",
    500: "#71717a",
    600: "#52525b",
    700: "#3f3f46",
    800: "#27272a",
    900: "#18181b",
    950: "#09090b",
  },
  
  // Cores de superfície (Cards e containers)
  surface: {
    light: {
      primary: "#ffffff",
      secondary: "#f8fafc",
      tertiary: "#f1f5f9",
      elevated: "#ffffff",
    },
    dark: {
      primary: "#0f172a",
      secondary: "#1e293b",
      tertiary: "#334155",
      elevated: "#1e293b",
    },
  },
}

// -----------------------------------------------------------------------------
// PALETA DE GRÁFICOS (Sistema de cores para visualização de dados)
// -----------------------------------------------------------------------------
export const chartColors = {
  // Paleta principal (8 cores harmonizadas)
  primary: [
    "#2563eb", // Blue
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#f97316", // Orange
    "#84cc16", // Lime
    "#06b6d4", // Cyan
    "#ef4444", // Red
    "#64748b", // Gray
  ],
  
  // Paleta alternativa (gradientes suaves)
  alternative: [
    "#3b82f6", "#60a5fa", "#93c5fd", // Blue gradient
    "#8b5cf6", "#a78bfa", "#c4b5fd", // Purple gradient
    "#ec4899", "#f472b6", "#fbcfe8", // Pink gradient
    "#f97316", "#fb923c", "#fdba74", // Orange gradient
  ],
  
  // Paleta semântica para dados financeiros
  financial: [
    "#10b981", // Revenue Green
    "#3b82f6", // Expenses Blue
    "#f59e0b", // Profit Orange
    "#ef4444", // Loss Red
    "#8b5cf6", // Investment Purple
    "#06b6d4", // Cash Flow Cyan
  ],
  
  // Gradientes predefinidos
  gradients: {
    blue: ["#3b82f6", "#60a5fa", "#93c5fd"],
    purple: ["#8b5cf6", "#a78bfa", "#c4b5fd"],
    green: ["#10b981", "#34d399", "#6ee7b7"],
    orange: ["#f97316", "#fb923c", "#fdba74"],
  },
}

// -----------------------------------------------------------------------------
// SISTEMA DE TIPOGRAFIA (Escala tipográfica profissional)
// -----------------------------------------------------------------------------
export const typography = {
  // Tamanhos de fonte (px) - Escala modular
  sizes: {
    display: { lg: 32, md: 28, sm: 24 },
    heading: { lg: 24, md: 20, sm: 18, xs: 16 },
    title: { lg: 20, md: 18, sm: 16, xs: 14 },
    subtitle: { lg: 16, md: 14, sm: 13, xs: 12 },
    body: { lg: 16, md: 14, sm: 13, xs: 12 },
    caption: { lg: 12, md: 11, sm: 10, xs: 9 },
    label: { lg: 12, md: 11, sm: 10, xs: 9 },
  },
  
  // Pesos de fonte
  weights: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  
  // Alturas de linha
  lineHeights: {
    tight: 1.1,
    snug: 1.3,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2.0,
  },
  
  // Espaçamento entre letras
  letterSpacing: {
    tighter: "-0.05em",
    tight: "-0.025em",
    normal: "0em",
    wide: "0.025em",
    wider: "0.05em",
    widest: "0.1em",
  },
}

// -----------------------------------------------------------------------------
// SISTEMA DE ESPAÇAMENTO (Grid e espaçamentos consistentes)
// -----------------------------------------------------------------------------
export const spacing = {
  // Espaçamento base (4px grid system)
  base: 4,
  
  // Escala de espaçamento
  scale: {
    xs: 4,    // 4px
    sm: 8,     // 8px
    md: 12,    // 12px
    lg: 16,    // 16px
    xl: 20,    // 20px
    "2xl": 24, // 24px
    "3xl": 32, // 32px
    "4xl": 40, // 40px
    "5xl": 48, // 48px
    "6xl": 56, // 56px
  },
  
  // Espaçamentos específicos
  card: {
    padding: 20,
    gap: 16,
    radius: 12,
  },
  
  section: {
    padding: 24,
    gap: 20,
  },
  
  grid: {
    gap: 16,
    column: 12,
    gutter: 16,
  },
}

// -----------------------------------------------------------------------------
// SISTEMA DE BORDAS E SOMBRAS
// -----------------------------------------------------------------------------
export const effects = {
  // Bordas
  borders: {
    none: "0px",
    sm: "1px",
    md: "2px",
    lg: "4px",
  },
  
  // Raios de borda
  radii: {
    none: "0px",
    sm: "4px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    "2xl": "20px",
    full: "9999px",
  },
  
  // Sombras (elevation system)
  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
    "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    
    // Sombras para dark mode
    dark: {
      sm: "0 1px 2px 0 rgba(255, 255, 255, 0.05)",
      md: "0 4px 6px -1px rgba(255, 255, 255, 0.1), 0 2px 4px -2px rgba(255, 255, 255, 0.1)",
      lg: "0 10px 15px -3px rgba(255, 255, 255, 0.1), 0 4px 6px -4px rgba(255, 255, 255, 0.1)",
    },
  },
}

// -----------------------------------------------------------------------------
// DIMENSÕES PARA PDF (Otimizado para formato A4)
// -----------------------------------------------------------------------------
export const pdfDimensions = {
  // Formato A4 padrão (pt units - 1pt = 1/72 inch)
  a4: {
    width: 595,    // ~210mm
    height: 842,   // ~297mm
  },
  
  // Margens técnicas (áreas seguras)
  margins: {
    safe: 36,      // ~12.7mm (margem segura)
    minimal: 18,   // ~6.35mm (margem mínima)
    technical: 72, // ~25.4mm (margem técnica para encadernação)
  },
  
  // Grid system para PDF
  grid: {
    columns: 12,
    gutter: 16,    // ~5.6mm
    column: 43,    // ~15.2mm por coluna (12 colunas + 11 gutters = 595-72*2)
  },
  
  // Tamanhos de fonte para PDF (pt)
  fontSize: {
    display: 24,
    heading: 18,
    title: 14,
    subtitle: 12,
    body: 10,
    caption: 9,
    label: 8,
  },
  
  // Espaçamento para PDF
  spacing: {
    section: 24,
    paragraph: 12,
    element: 8,
  },
}

// -----------------------------------------------------------------------------
// UTILITÁRIOS DE DESIGN
// -----------------------------------------------------------------------------

/**
 * Retorna cor baseada no tema (light/dark)
 */
export const themeColor = (color: string, darkColor: string, darkMode: boolean = false): string => {
  return darkMode ? darkColor : color
}

/**
 * Retorna gradiente linear
 */
export const gradient = (colors: string[], angle: number = 90): string => {
  return `linear-gradient(${angle}deg, ${colors.join(', ')})`
}

/**
 * Retorna sombra baseada no tema
 */
export const themeShadow = (shadow: string, darkShadow: string, darkMode: boolean = false): string => {
  return darkMode ? darkShadow : shadow
}

/**
 * Converte pixels para pontos (para PDF)
 */
export const pxToPt = (px: number): number => {
  return px * 0.75 // 1px = 0.75pt (aproximação)
}

/**
 * Converte pontos para pixels (para screen)
 */
export const ptToPx = (pt: number): number => {
  return pt * 1.333 // 1pt = 1.333px (aproximação)
}

// -----------------------------------------------------------------------------
// CONSTANTES DE LAYOUT
// -----------------------------------------------------------------------------
export const layout = {
  // Breakpoints responsivos
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    "2xl": 1536,
  },
  
  // Container widths
  container: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    "2xl": 1536,
  },
  
  // Aspect ratios
  aspectRatio: {
    square: "1 / 1",
    video: "16 / 9",
    banner: "4 / 1",
    card: "3 / 2",
    portrait: "2 / 3",
  },
}

// -----------------------------------------------------------------------------
// ANIMAÇÕES E TRANSITIONS
// -----------------------------------------------------------------------------
export const motion = {
  // Durações
  duration: {
    fastest: 100,
    faster: 150,
    fast: 200,
    normal: 300,
    slow: 500,
    slower: 700,
    slowest: 1000,
  },
  
  // Curvas de easing
  easing: {
    default: "cubic-bezier(0.4, 0, 0.2, 1)",
    linear: "linear",
    in: "cubic-bezier(0.4, 0, 1, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
    inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  
  // Transitions predefinidas
  transitions: {
    fade: "opacity 0.3s ease",
    slide: "transform 0.3s ease, opacity 0.3s ease",
    bounce: "transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
  },
}