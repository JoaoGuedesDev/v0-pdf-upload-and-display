/**
 * Modern PDF Generator
 * 
 * Um gerador de PDF moderno e eficiente usando jsPDF com:
 * - Esquema de cores vibrantes e acessíveis
 * - Links clicáveis para WhatsApp
 * - Layout responsivo
 * - Metadados completos
 * - Compatibilidade com navegadores
 * 
 * @author Sistema de Geração de PDF
 * @version 2.0.0
 */

import jsPDF from 'jspdf';
import chroma from 'chroma-js';

// Esquema de cores vibrantes com ótimo contraste (WCAG AA compliant)
export const ColorScheme = {
  // Cores primárias
  primary: '#2563eb',      // Azul vibrante (contraste 4.5:1 com branco)
  primaryDark: '#1d4ed8',  // Azul escuro
  primaryLight: '#3b82f6', // Azul claro
  
  // Cores secundárias
  secondary: '#7c3aed',    // Roxo vibrante
  accent: '#059669',       // Verde esmeralda
  warning: '#d97706',      // Laranja âmbar
  error: '#dc2626',        // Vermelho vibrante
  
  // Cores neutras
  background: '#ffffff',   // Branco puro
  surface: '#f8fafc',      // Cinza muito claro
  text: '#0f172a',         // Preto slate
  textSecondary: '#475569', // Cinza médio
  border: '#e2e8f0',      // Cinza claro
  
  // Cores de destaque
  success: '#16a34a',      // Verde sucesso
  info: '#0ea5e9',         // Azul informativo
  
  // Gradientes
  gradientPrimary: ['#2563eb', '#3b82f6'],
  gradientSecondary: ['#7c3aed', '#a855f7'],
  gradientSuccess: ['#059669', '#10b981'],
} as const;

// Configurações de layout responsivo
export const LayoutConfig = {
  // Tamanhos de página
  pageFormats: {
    A4: { width: 595.28, height: 841.89 },
    Letter: { width: 612, height: 792 },
    Legal: { width: 612, height: 1008 },
  },
  
  // Margens responsivas
  margins: {
    desktop: { top: 60, right: 60, bottom: 60, left: 60 },
    tablet: { top: 40, right: 40, bottom: 40, left: 40 },
    mobile: { top: 30, right: 30, bottom: 30, left: 30 },
    // Margens técnicas mínimas (2-3mm convertidas para pontos)
    // 1mm = 2.834645669 pontos
    technical: { top: 8.5, right: 8.5, bottom: 8.5, left: 8.5 }, // 3mm
    minimal: { top: 5.67, right: 5.67, bottom: 5.67, left: 5.67 }, // 2mm
  },
  
  // Tipografia
  fonts: {
    heading: { size: 24, lineHeight: 1.2 },
    subheading: { size: 18, lineHeight: 1.3 },
    body: { size: 12, lineHeight: 1.5 },
    caption: { size: 10, lineHeight: 1.4 },
  },
} as const;

// Interface para itens de conteúdo
export interface ContentItem {
  type: 'text' | 'heading' | 'paragraph';
  data: string;
  style?: {
    fontSize?: number;
    color?: string;
    align?: 'left' | 'center' | 'right';
  };
}

// Interface para dados do documento
export interface DocumentData {
  title: string;
  subtitle?: string;
  content: ContentItem[] | string;
  author?: string;
  date?: Date;
  whatsapp?: {
    number: string;
    message?: string;
  };
  whatsappConfig?: {
    phoneNumber: string;
    message: string;
    buttonText?: string;
  };
  tables?: Array<{
    headers: string[];
    rows: string[][];
  }>;
  metadata?: {
    subject?: string;
    keywords?: string[];
    creator?: string;
    author?: string;
  };
}

// Interface para opções de geração
export interface GenerationOptions {
  format?: 'A4' | 'Letter' | 'Legal';
  pageFormat?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  colorScheme?: ColorScheme | string;
  includeWatermark?: boolean;
  fontSize?: number;
  quality?: 'standard' | 'high' | 'print' | 'technical';
  marginType?: 'desktop' | 'tablet' | 'mobile' | 'technical' | 'minimal';
  includePrintGuides?: boolean;
  maxAreaUtilization?: boolean;
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  textSecondary: string;
}

// Utilitários do WhatsApp
export const WhatsAppUtils = {
  validateBrazilianNumber: (number: string): boolean => {
    const cleanNumber = number.replace(/\D/g, '');
    return /^55\d{10,11}$/.test(cleanNumber) || /^\d{10,11}$/.test(cleanNumber);
  },

  generateWhatsAppURL: (number: string, message?: string): string => {
    const cleanNumber = number.replace(/\D/g, '');
    const formattedNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
    const encodedMessage = message ? encodeURIComponent(message) : '';
    return `https://wa.me/${formattedNumber}${encodedMessage ? `?text=${encodedMessage}` : ''}`;
  }
};

// Classe principal do gerador
export class ModernPDFGenerator {
  private doc: jsPDF;
  private options: GenerationOptions;
  private colorScheme: ColorScheme;
  private currentY: number = 20;
  
  constructor(options: GenerationOptions = {}) {
    // Configurar margens baseadas no tipo especificado
    let defaultMargins = { top: 20, right: 20, bottom: 20, left: 20 };
    
    if (options.marginType) {
      const marginConfig = LayoutConfig.margins[options.marginType];
      if (marginConfig) {
        defaultMargins = marginConfig;
      }
    }
    
    // Para qualidade técnica, usar margens mínimas por padrão
    if (options.quality === 'technical' && !options.marginType) {
      defaultMargins = LayoutConfig.margins.technical;
    }
    
    this.options = {
      format: 'A4',
      orientation: 'portrait',
      colorScheme: ColorUtils.generateVibrantPalette(),
      includeWatermark: false,
      fontSize: 12,
      quality: 'standard',
      marginType: 'desktop',
      includePrintGuides: false,
      maxAreaUtilization: false,
      margins: defaultMargins,
      ...options
    };

    // Handle colorScheme properly - if it's a string, use default palette
    if (typeof this.options.colorScheme === 'string') {
      this.colorScheme = ColorUtils.generateVibrantPalette();
    } else {
      this.colorScheme = this.options.colorScheme!;
    }
    
    this.doc = new jsPDF({
      orientation: this.options.orientation,
      unit: 'pt', // Usar pontos para maior precisão
      format: this.options.format?.toLowerCase() as any
    });
    
    // Configurar Y inicial baseado na margem superior
    this.currentY = this.options.margins!.top;
  }
  
  setMetadata(data: DocumentData): void {
    this.doc.setProperties({
      title: data.title,
      subject: data.metadata?.subject || data.subtitle,
      author: data.author || data.metadata?.creator || 'Modern PDF Generator',
      keywords: data.metadata?.keywords?.join(', ') || '',
      creator: 'Modern PDF Generator v2.0'
    });
  }
  
  addHeader(title: string, subtitle?: string): void {
    const pageWidth = this.doc.internal.pageSize.getWidth();
    
    // Title
    this.doc.setFontSize(24);
    this.doc.setTextColor(this.colorScheme.primary);
    this.doc.text(title, pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 15;

    // Subtitle
    if (subtitle) {
      this.doc.setFontSize(16);
      this.doc.setTextColor(this.colorScheme.secondary);
      this.doc.text(subtitle, pageWidth / 2, this.currentY, { align: 'center' });
      this.currentY += 10;
    }

    // Separator line
    this.doc.setDrawColor(this.colorScheme.accent);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.options.margins!.left, this.currentY, pageWidth - this.options.margins!.right, this.currentY);
    this.currentY += 10;
  }
  
  addWhatsAppButton(number: string, message?: string, buttonText?: string): void {
    if (!WhatsAppUtils.validateBrazilianNumber(number)) {
      throw new Error('Número do WhatsApp inválido');
    }

    const url = WhatsAppUtils.generateWhatsAppURL(number, message);
    const pageWidth = this.doc.internal.pageSize.getWidth();
    const buttonWidth = 80;
    const buttonHeight = 12;
    const buttonX = pageWidth / 2 - buttonWidth / 2;
    const buttonY = this.currentY;
    
    // Fundo do botão WhatsApp com cor verde característica
    this.doc.setFillColor('#25D366'); // Verde oficial do WhatsApp
    this.doc.roundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 3, 3, 'F');
    
    // Borda para melhor acessibilidade
    this.doc.setDrawColor('#1DA851'); // Verde mais escuro para borda
    this.doc.setLineWidth(0.5);
    this.doc.roundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 3, 3, 'S');
    
    // Texto do botão
    this.doc.setFontSize(10);
    this.doc.setTextColor('#ffffff');
    const displayText = buttonText || '📱 Contatar via WhatsApp';
    
    // Adiciona o link clicável com área maior para melhor acessibilidade
    this.doc.textWithLink(displayText, pageWidth / 2, buttonY + 8, { 
      align: 'center',
      url: url
    });
    
    // Adiciona área clicável invisível maior para melhor usabilidade
    this.doc.link(buttonX - 5, buttonY - 2, buttonWidth + 10, buttonHeight + 4, { url: url });
    
    // Adiciona texto informativo abaixo do botão
    this.doc.setFontSize(8);
    this.doc.setTextColor(this.colorScheme.textSecondary);
    this.doc.text('Clique para abrir conversa no WhatsApp', pageWidth / 2, buttonY + buttonHeight + 8, { align: 'center' });
    
    this.currentY += buttonHeight + 20;
  }
  
  addText(content: string | ContentItem[], options: { fontSize?: number; color?: string; align?: 'left' | 'center' | 'right' } = {}): void {
    // Se for string, converte para array de ContentItem
    const items: ContentItem[] = typeof content === 'string' 
      ? [{ type: 'text', data: content }]
      : content;

    for (const item of items) {
      const itemOptions = {
        fontSize: item.style?.fontSize || options.fontSize || this.options.fontSize!,
        color: item.style?.color || options.color || this.colorScheme.text,
        align: item.style?.align || options.align || 'left'
      };

      // Ajustar tamanho da fonte baseado no tipo
      let fontSize = itemOptions.fontSize;
      if (item.type === 'heading') {
        fontSize = Math.round(fontSize * 1.5);
      } else if (item.type === 'paragraph') {
        fontSize = Math.round(fontSize * 0.9);
      }

      this.doc.setFontSize(fontSize);
      this.doc.setTextColor(itemOptions.color);
      
      const pageWidth = this.doc.internal.pageSize.getWidth();
      const maxWidth = pageWidth - this.options.margins!.left - this.options.margins!.right;
      
      const lines = this.doc.splitTextToSize(item.data, maxWidth);
      
      for (const line of lines) {
        this.doc.text(line, this.options.margins!.left, this.currentY, { align: itemOptions.align });
        
        // Espaçamento otimizado baseado na qualidade
        const lineSpacing = this.options.maxAreaUtilization ? 
          (fontSize * 0.4) : // Espaçamento compacto para máxima utilização
          (fontSize * 0.6);   // Espaçamento normal
          
        this.currentY += lineSpacing;
      }
      
      // Espaçamento entre elementos otimizado
      const elementSpacing = this.options.maxAreaUtilization ? 3 : 5;
      this.currentY += elementSpacing;
    }
  }
  
  addTable(headers: string[], rows: string[][]): void {
    const pageWidth = this.doc.internal.pageSize.getWidth();
    const tableWidth = pageWidth - this.options.margins!.left - this.options.margins!.right;
    const colWidth = tableWidth / headers.length;
    
    // Headers
    this.doc.setFillColor(this.colorScheme.primary);
    this.doc.rect(this.options.margins!.left, this.currentY, tableWidth, 8, 'F');
    
    this.doc.setFontSize(10);
    this.doc.setTextColor('#ffffff');
    
    headers.forEach((header, index) => {
      this.doc.text(header, this.options.margins!.left + (index * colWidth) + 2, this.currentY + 6);
    });
    
    this.currentY += 8;
    
    // Rows
    this.doc.setTextColor(this.colorScheme.text);
    rows.forEach((row, rowIndex) => {
      if (rowIndex % 2 === 0) {
        this.doc.setFillColor('#f8f9fa');
        this.doc.rect(this.options.margins!.left, this.currentY, tableWidth, 6, 'F');
      }
      
      row.forEach((cell, colIndex) => {
        this.doc.text(cell, this.options.margins!.left + (colIndex * colWidth) + 2, this.currentY + 4);
      });
      
      this.currentY += 6;
    });
    
    this.currentY += 10;
  }
  
  addFooter(): void {
    const pageHeight = this.doc.internal.pageSize.getHeight();
    const pageWidth = this.doc.internal.pageSize.getWidth();
    
    this.doc.setFontSize(8);
    this.doc.setTextColor(this.colorScheme.secondary);
    
    const footerText = `Gerado em ${new Date().toLocaleDateString('pt-BR')} - Modern PDF Generator`;
    this.doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }
  
  addPrintGuides(): void {
    if (!this.options.includePrintGuides) return;
    
    const pageHeight = this.doc.internal.pageSize.getHeight();
    const pageWidth = this.doc.internal.pageSize.getWidth();
    const guideLength = 14.17; // 5mm em pontos
    
    // Configurar linha fina para guias
    this.doc.setLineWidth(0.5);
    this.doc.setDrawColor('#000000');
    
    // Guias de corte nos cantos
    // Canto superior esquerdo
    this.doc.line(0, guideLength, guideLength, guideLength); // horizontal
    this.doc.line(guideLength, 0, guideLength, guideLength); // vertical
    
    // Canto superior direito
    this.doc.line(pageWidth - guideLength, guideLength, pageWidth, guideLength); // horizontal
    this.doc.line(pageWidth - guideLength, 0, pageWidth - guideLength, guideLength); // vertical
    
    // Canto inferior esquerdo
    this.doc.line(0, pageHeight - guideLength, guideLength, pageHeight - guideLength); // horizontal
    this.doc.line(guideLength, pageHeight - guideLength, guideLength, pageHeight); // vertical
    
    // Canto inferior direito
    this.doc.line(pageWidth - guideLength, pageHeight - guideLength, pageWidth, pageHeight - guideLength); // horizontal
    this.doc.line(pageWidth - guideLength, pageHeight - guideLength, pageWidth - guideLength, pageHeight); // vertical
    
    // Marcações de centro nas bordas
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;
    const markLength = 8.5; // 3mm em pontos
    
    // Centro superior
    this.doc.line(centerX - markLength/2, 0, centerX + markLength/2, 0);
    // Centro inferior
    this.doc.line(centerX - markLength/2, pageHeight, centerX + markLength/2, pageHeight);
    // Centro esquerdo
    this.doc.line(0, centerY - markLength/2, 0, centerY + markLength/2);
    // Centro direito
    this.doc.line(pageWidth, centerY - markLength/2, pageWidth, centerY + markLength/2);
    
    // Área de impressão segura (opcional - linha pontilhada)
    if (this.options.quality === 'technical') {
      this.doc.setLineDashPattern([2, 2], 0);
      this.doc.setDrawColor('#cccccc');
      this.doc.rect(
        this.options.margins!.left,
        this.options.margins!.top,
        pageWidth - this.options.margins!.left - this.options.margins!.right,
        pageHeight - this.options.margins!.top - this.options.margins!.bottom
      );
      this.doc.setLineDashPattern([], 0); // Reset dash pattern
    }
  }
  
  optimizeSpacing(): void {
    if (!this.options.maxAreaUtilization) return;
    
    // Reduzir espaçamentos entre elementos para maximizar uso da área
    const pageHeight = this.doc.internal.pageSize.getHeight();
    const usableHeight = pageHeight - this.options.margins!.top - this.options.margins!.bottom;
    
    // Ajustar currentY se necessário para otimizar espaço
    if (this.currentY > this.options.margins!.top + (usableHeight * 0.98)) {
      // Se estamos próximos do limite, compactar mais
      this.currentY = Math.min(this.currentY, pageHeight - this.options.margins!.bottom - 20);
    }
  }
  
  generate(): Uint8Array {
    // Otimizar espaçamento antes de finalizar
    this.optimizeSpacing();
    
    // Adicionar guias de impressão se solicitado
    this.addPrintGuides();
    
    // Adicionar rodapé
    this.addFooter();
    
    return new Uint8Array(this.doc.output('arraybuffer'));
  }
  
  static generateDocument(data: DocumentData, options: GenerationOptions = {}): Uint8Array {
    const generator = new ModernPDFGenerator(options);
    
    // Set metadata
    generator.setMetadata(data);
    
    // Add header
    generator.addHeader(data.title, data.subtitle);
    
    // Add WhatsApp button if provided (check both properties for compatibility)
    const whatsappData = data.whatsappConfig || data.whatsapp;
    if (whatsappData) {
      const phoneNumber = 'phoneNumber' in whatsappData ? whatsappData.phoneNumber : whatsappData.number;
      const message = whatsappData.message || 'Olá! Gostaria de mais informações.';
      const buttonText = 'buttonText' in whatsappData ? whatsappData.buttonText : undefined;
      generator.addWhatsAppButton(phoneNumber, message, buttonText);
    }
    
    // Add main content
    generator.addText(data.content);
    
    // Add tables if provided
    if (data.tables) {
      data.tables.forEach(table => {
        generator.addTable(table.headers, table.rows);
      });
    }
    
    return generator.generate();
  }
}

// Utilitários para validação de cores
export const ColorUtils = {
  /**
   * Valida se uma cor é acessível
   */
  isAccessible: (foreground: string, background: string = ColorScheme.background): boolean => {
    return chroma.contrast(foreground, background) >= 4.5;
  },
  
  /**
   * Gera paleta de cores vibrantes
   */
  generateVibrantPalette: (): ColorScheme => {
    const colors = chroma.scale(['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57']).colors(5);
    return {
      primary: colors[0],
      secondary: colors[1],
      accent: colors[2],
      background: '#ffffff',
      text: '#2c3e50',
      textSecondary: '#7f8c8d'
    };
  },
  
  /**
   * Converte cor para diferentes formatos
   */
  convertColor: (color: string, format: 'hex' | 'rgb' | 'hsl' = 'hex'): string => {
    try {
      const chromaColor = chroma(color);
      switch (format) {
        case 'rgb': return chromaColor.css();
        case 'hsl': return chromaColor.css('hsl');
        default: return chromaColor.hex();
      }
    } catch {
      return format === 'hex' ? '#000000' : 'rgb(0, 0, 0)';
    }
  },
};

export default ModernPDFGenerator;