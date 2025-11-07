declare module '@vercel/kv' {
  export const kv: any
}

// Ambient module declarations to satisfy editor TypeScript diagnostics
// for packages that are correctly installed but whose types may not be
// picked up by the current TS server configuration.
declare module '@vercel/analytics/react' {
  export const Analytics: any
}

declare module 'lucide-react' {
  export const Upload: any
  export const FileText: any
  export const TrendingUp: any
  export const AlertCircle: any
  export const AlertTriangle: any
  export const Loader2: any
  export const DollarSign: any
  export const Sun: any
  export const Moon: any
  export const Download: any
  export const Clock: any
  export const Shield: any
}

declare module 'recharts' {
  export const BarChart: any
  export const Bar: any
  export const PieChart: any
  export const Pie: any
  export const LineChart: any
  export const Line: any
  export const XAxis: any
  export const YAxis: any
  export const CartesianGrid: any
  export const Tooltip: any
  export const Legend: any
  export const ResponsiveContainer: any
  export const Cell: any
  export const LabelList: any
}

declare module 'html-to-image' {
  export function toPng(node: HTMLElement, options?: any): Promise<string>
}

declare module 'jspdf' {
  export const jsPDF: any
}

declare module 'pdf-lib' {
  export const PDFDocument: any
  export const StandardFonts: any
  export const rgb: any
}