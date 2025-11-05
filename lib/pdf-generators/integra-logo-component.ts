/**
 * Componente do Logo da Integra para PDF
 * 
 * Gera o logo da Integra em alta resolução (300dpi+) para uso em PDFs
 * com posicionamento centralizado e dimensões otimizadas.
 * 
 * @version 1.0.0
 */

import jsPDF from 'jspdf';

export interface LogoOptions {
  x: number;
  y: number;
  width?: number;
  height?: number;
  resolution?: number; // DPI
  centerX?: boolean;
  centerY?: boolean;
}

export class IntegraLogoComponent {
  private doc: jsPDF;
  
  constructor(doc: jsPDF) {
    this.doc = doc;
  }
  
  /**
   * Adiciona o logo da Integra ao PDF com alta resolução
   */
  addLogo(options: LogoOptions): void {
    const {
      x,
      y,
      width = 120,
      height = 24,
      resolution = 300,
      centerX = false,
      centerY = false
    } = options;
    
    // Validar parâmetros de entrada
    if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      // Silenciar logs de debug; validação mantém retorno antecipado
      return;
    }
    
    // Calcular posição final considerando centralização
    const pageWidth = this.doc.internal.pageSize.getWidth();
    const pageHeight = this.doc.internal.pageSize.getHeight();
    
    const finalX = centerX ? (pageWidth - width) / 2 : x;
    const finalY = centerY ? (pageHeight - height) / 2 : y;
    
    // Validar posições finais
    if (isNaN(finalX) || isNaN(finalY)) {
      // Silenciar logs de debug; validação mantém retorno antecipado
      return;
    }
    
    // Configurar resolução para alta qualidade
    const scaleFactor = resolution / 72; // 72 DPI é o padrão
    
    // Desenhar o logo usando formas vetoriais para máxima qualidade
    this.drawVectorLogo(finalX, finalY, width, height, scaleFactor);
  }
  
  /**
   * Desenha o logo usando formas vetoriais para máxima qualidade
   */
  private drawVectorLogo(x: number, y: number, width: number, height: number, scaleFactor: number): void {
    // Salvar estado atual
    this.doc.saveGraphicsState();
    
    // Configurar cores do logo (baseado no SVG original)
    const primaryColor = '#4a4a4a'; // Cor principal do texto
    const secondaryColor = '#6a6a6a'; // Cor secundária
    
    // Desenhar ícone da Integra (puzzle piece estilizado)
    this.drawPuzzleIcon(x, y, height, primaryColor);
    
    // Desenhar texto "INTEGRA"
    const textStartX = x + height + 8; // Espaço após o ícone
    this.drawIntegraText(textStartX, y, primaryColor);
    
    // Desenhar texto "SOLUÇÕES EMPRESARIAIS"
    this.drawSubtitleText(textStartX, y + height * 0.7, secondaryColor);
    
    // Restaurar estado
    this.doc.restoreGraphicsState();
  }
  
  /**
   * Desenha o ícone de puzzle estilizado
   */
  private drawPuzzleIcon(x: number, y: number, size: number, color: string): void {
    // Validar parâmetros de entrada
    if (!x || !y || !size || isNaN(x) || isNaN(y) || isNaN(size) || size <= 0) {
      // Silenciar logs de debug; validação mantém retorno antecipado
      return;
    }
    
    this.doc.setFillColor(color);
    this.doc.setDrawColor(color);
    
    // Peça principal do puzzle (retângulo com encaixes)
    const iconSize = Math.max(size * 0.8, 1); // Garantir tamanho mínimo
    const cornerRadius = Math.max(iconSize * 0.1, 0.5); // Garantir raio mínimo
    
    // Corpo principal
    const rectWidth = Math.max(iconSize * 0.6, 1);
    const rectHeight = Math.max(iconSize * 0.8, 1);
    const rectY = y + Math.max(size * 0.1, 0);
    
    this.doc.roundedRect(x, rectY, rectWidth, rectHeight, cornerRadius, cornerRadius, 'F');
    
    // Encaixe superior
    const notchSize = Math.max(iconSize * 0.15, 0.5); // Garantir tamanho mínimo
    const notchX1 = x + iconSize * 0.3;
    const notchY1 = rectY;
    
    if (notchSize > 0 && !isNaN(notchX1) && !isNaN(notchY1)) {
      this.doc.circle(notchX1, notchY1, notchSize, 'F');
    }
    
    // Encaixe lateral
    const notchX2 = x + iconSize * 0.6;
    const notchY2 = y + size * 0.5;
    
    if (notchSize > 0 && !isNaN(notchX2) && !isNaN(notchY2)) {
      this.doc.circle(notchX2, notchY2, notchSize, 'F');
    }
    
    // Peça secundária (menor)
    const smallRectX = x + iconSize * 0.7;
    const smallRectY = y + size * 0.3;
    const smallRectWidth = Math.max(iconSize * 0.25, 1);
    const smallRectHeight = Math.max(iconSize * 0.4, 1);
    const smallCornerRadius = Math.max(cornerRadius * 0.5, 0.25);
    
    this.doc.roundedRect(
      smallRectX, 
      smallRectY, 
      smallRectWidth, 
      smallRectHeight, 
      smallCornerRadius, 
      smallCornerRadius, 
      'F'
    );
  }
  
  /**
   * Desenha o texto "INTEGRA" com fonte otimizada
   */
  private drawIntegraText(x: number, y: number, color: string): void {
    // Validar parâmetros de entrada
    if (isNaN(x) || isNaN(y) || !color) {
      // Silenciar logs de debug; validação mantém retorno antecipado
      return;
    }
    
    this.doc.setTextColor(color);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(14);
    
    const text = 'INTEGRA';
    const charSpacing = 1.2;
    
    // Desenhar cada caractere com espaçamento personalizado
    let currentX = x;
    for (let i = 0; i < text.length; i++) {
      if (!isNaN(currentX) && !isNaN(y)) {
        this.doc.text(text[i], currentX, y + 12);
        currentX += this.doc.getTextWidth(text[i]) + charSpacing;
      }
    }
  }
  
  /**
   * Desenha o texto "SOLUÇÕES EMPRESARIAIS"
   */
  private drawSubtitleText(x: number, y: number, color: string): void {
    // Validar parâmetros de entrada
    if (isNaN(x) || isNaN(y) || !color) {
      // Silenciar logs de debug; validação mantém retorno antecipado
      return;
    }
    
    this.doc.setTextColor(color);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7);
    
    const text = 'SOLUÇÕES EMPRESARIAIS';
    const charSpacing = 0.8;
    
    // Desenhar com espaçamento entre caracteres
    let currentX = x;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === ' ') {
        currentX += 3; // Espaço maior entre palavras
        continue;
      }
      if (!isNaN(currentX) && !isNaN(y)) {
        this.doc.text(text[i], currentX, y);
        currentX += this.doc.getTextWidth(text[i]) + charSpacing;
      }
    }
  }
  
  /**
   * Calcula as dimensões ideais do logo baseado na largura disponível
   */
  static calculateOptimalSize(availableWidth: number, maxHeight: number = 30): { width: number; height: number } {
    // Proporção ideal do logo (baseado no design original)
    const aspectRatio = 5; // 5:1 (largura:altura)
    
    let width = Math.min(availableWidth * 0.8, 150); // Máximo 80% da largura disponível
    let height = width / aspectRatio;
    
    // Ajustar se a altura exceder o máximo
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    
    return { width, height };
  }
  
  /**
   * Adiciona logo centralizado no cabeçalho
   */
  addCenteredHeaderLogo(marginTop: number = 20): { width: number; height: number; bottomY: number } {
    const pageWidth = this.doc.internal.pageSize.getWidth();
    const optimalSize = IntegraLogoComponent.calculateOptimalSize(pageWidth - 40);
    
    const logoX = (pageWidth - optimalSize.width) / 2;
    const logoY = marginTop;
    
    this.addLogo({
      x: logoX,
      y: logoY,
      width: optimalSize.width,
      height: optimalSize.height,
      resolution: 300
    });
    
    return {
      width: optimalSize.width,
      height: optimalSize.height,
      bottomY: logoY + optimalSize.height
    };
  }
}

export default IntegraLogoComponent;