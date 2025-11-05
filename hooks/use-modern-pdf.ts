/**
 * Hook React para geração de PDF moderno com jsPDF
 * 
 * Fornece uma interface simples e reativa para gerar PDFs
 * com tratamento de estado, loading e erros.
 */
'use client';

import { useState, useCallback } from 'react';
import { ModernPDFGenerator, DocumentData, GenerationOptions } from '@/lib/pdf-generators/modern-pdf-generator';

export interface UsePDFState {
  isGenerating: boolean;
  error: string | null;
  progress: number;
  lastGenerated: Date | null;
}

export interface UsePDFActions {
  generatePDF: (data: DocumentData, options?: GenerationOptions) => Promise<Blob | null>;
  downloadPDF: (data: DocumentData, filename?: string, options?: GenerationOptions) => Promise<void>;
  previewPDF: (data: DocumentData, options?: GenerationOptions) => Promise<string | null>;
  clearError: () => void;
  reset: () => void;
}

export interface UsePDFReturn extends UsePDFState, UsePDFActions {}

/**
 * Hook principal para geração de PDF com configurações aprimoradas
 */
export function useModernPDF(): UsePDFReturn {
  const [state, setState] = useState<UsePDFState>({
    isGenerating: false,
    error: null,
    progress: 0,
    lastGenerated: null,
  });

  const updateState = useCallback((updates: Partial<UsePDFState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  const reset = useCallback(() => {
    setState({
      isGenerating: false,
      error: null,
      progress: 0,
      lastGenerated: null,
    });
  }, []);

  const generatePDF = useCallback(async (
    data: DocumentData,
    options: GenerationOptions = {}
  ): Promise<Blob | null> => {
    try {
      updateState({ isGenerating: true, error: null, progress: 0 });

      // Validação dos dados
      if (!data.title || !data.content || data.content.length === 0) {
        throw new Error('Dados do documento inválidos: título e conteúdo são obrigatórios');
      }

      // Validação do WhatsApp (se configurado)
      if (data.whatsappConfig) {
        const { phoneNumber, message } = data.whatsappConfig;
        if (!phoneNumber || !message) {
          throw new Error('Configuração do WhatsApp inválida: telefone e mensagem são obrigatórios');
        }
        
        // Validação do formato do telefone
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        if (cleanPhone.length < 10 || cleanPhone.length > 15) {
          throw new Error('Número de telefone inválido');
        }
      }

      updateState({ progress: 25 });

      // Configurações padrão aprimoradas para alta qualidade
      const defaultOptions: GenerationOptions = {
        quality: 'technical',
        marginType: 'minimal',
        includeWatermark: false, // Removido por padrão
        includeHeaderLogo: true, // Logo da Integra por padrão
        pdfACompliant: true, // PDF/A-1b por padrão
        highResolution: true, // 300dpi por padrão
        losslessCompression: true, // Compactação sem perdas por padrão
        colorScheme: 'enhanced-vibrant', // Cores mais vibrantes por padrão
        ...options
      };

      // Geração do PDF com jsPDF e configurações aprimoradas
      const pdfArrayBuffer = ModernPDFGenerator.generateDocument(data, defaultOptions);
      
      updateState({ progress: 75 });

      // Conversão para Blob - garantir que seja um ArrayBuffer válido
      const blob = new Blob([pdfArrayBuffer as BlobPart], { type: 'application/pdf' });
      
      updateState({ 
        progress: 100, 
        isGenerating: false, 
        lastGenerated: new Date() 
      });

      return blob;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido na geração do PDF';
      updateState({ 
        error: errorMessage, 
        isGenerating: false, 
        progress: 0 
      });
      // Silenciar logs de debug; erro já é refletido no estado
      return null;
    }
  }, [updateState]);

  const downloadPDF = useCallback(async (
    data: DocumentData,
    filename: string = 'documento.pdf',
    options: GenerationOptions = {}
  ): Promise<void> => {
    try {
      const blob = await generatePDF(data, options);
      if (!blob) {
        throw new Error('Falha na geração do PDF');
      }

      // Download do arquivo
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro no download do PDF';
      updateState({ error: errorMessage });
      // Silenciar logs de debug; erro já é refletido no estado
    }
  }, [generatePDF, updateState]);

  const previewPDF = useCallback(async (
    data: DocumentData,
    options: GenerationOptions = {}
  ): Promise<string | null> => {
    try {
      const blob = await generatePDF(data, options);
      if (!blob) {
        throw new Error('Falha na geração do PDF para preview');
      }

      return URL.createObjectURL(blob);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro na geração do preview';
      updateState({ error: errorMessage });
      // Silenciar logs de debug; erro já é refletido no estado
      return null;
    }
  }, [generatePDF, updateState]);

  return {
    // Estado
    isGenerating: state.isGenerating,
    error: state.error,
    progress: state.progress,
    lastGenerated: state.lastGenerated,
    
    // Ações
    generatePDF,
    downloadPDF,
    previewPDF,
    clearError,
    reset,
  };
}

/**
 * Hook para validação de dados do documento
 */
export function useDocumentValidation() {
  const validateDocument = useCallback((data: DocumentData): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Validação básica
    if (!data.title || data.title.trim().length === 0) {
      errors.push('Título é obrigatório');
    }

    if (!data.content || data.content.length === 0) {
      errors.push('Conteúdo é obrigatório');
    }

    // Validação do conteúdo
    if (Array.isArray(data.content)) {
      data.content.forEach((item, index) => {
        if (!item.type) {
          errors.push(`Item ${index + 1}: tipo é obrigatório`);
        }

        if (!item.data) {
          errors.push(`Item ${index + 1}: dados são obrigatórios`);
        }

        // Validação específica por tipo
        switch (item.type) {
          case 'text':
          case 'heading':
          case 'paragraph':
            if (typeof item.data !== 'string' || item.data.trim().length === 0) {
              errors.push(`Item ${index + 1}: conteúdo de texto não pode estar vazio`);
            }
            break;
          default:
            errors.push(`Item ${index + 1}: tipo '${item.type}' não é suportado`);
        }
      });
    }

    // Validação do WhatsApp
    if (data.whatsappConfig) {
      const { phoneNumber, message } = data.whatsappConfig;
      
      if (!phoneNumber) {
        errors.push('WhatsApp: número de telefone é obrigatório');
      } else {
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        if (cleanPhone.length < 10 || cleanPhone.length > 15) {
          errors.push('WhatsApp: número de telefone inválido');
        }
      }

      if (!message || message.trim().length === 0) {
        errors.push('WhatsApp: mensagem é obrigatória');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, []);

  return { validateDocument };
}

/**
 * Hook para métricas e analytics do PDF
 */
export function usePDFAnalytics() {
  const [metrics, setMetrics] = useState({
    totalGenerated: 0,
    averageGenerationTime: 0,
    errorRate: 0,
    lastError: null as string | null,
  });

  const trackGeneration = useCallback((success: boolean, duration: number, error?: string) => {
    setMetrics(prev => ({
      totalGenerated: prev.totalGenerated + 1,
      averageGenerationTime: (prev.averageGenerationTime + duration) / 2,
      errorRate: success ? prev.errorRate : prev.errorRate + 1,
      lastError: error || prev.lastError,
    }));
  }, []);

  const resetMetrics = useCallback(() => {
    setMetrics({
      totalGenerated: 0,
      averageGenerationTime: 0,
      errorRate: 0,
      lastError: null,
    });
  }, []);

  return {
    metrics,
    trackGeneration,
    resetMetrics,
  };
}

export default useModernPDF;