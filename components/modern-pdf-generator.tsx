/**
 * Componente Moderno de Geração de PDF
 * 
 * Interface React para o gerador de PDF moderno com:
 * - UI responsiva e acessível
 * - Preview em tempo real
 * - Configurações avançadas
 * - Tratamento de erros
 * - Indicadores de progresso
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useModernPDF, useDocumentValidation } from '@/hooks/use-modern-pdf';
import { DocumentData, GenerationOptions, ColorScheme } from '@/lib/pdf-generators/modern-pdf-generator';
import { 
  Download, 
  Eye, 
  Smartphone, 
  Palette, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Settings,
  RefreshCw
} from 'lucide-react';

interface ModernPDFGeneratorProps {
  initialData?: Partial<DocumentData>;
  onGenerated?: (blob: Blob) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function ModernPDFGenerator({
  initialData,
  onGenerated,
  onError,
  className = '',
}: ModernPDFGeneratorProps) {
  // Hooks
  const { 
    isGenerating, 
    error, 
    progress, 
    generatePDF, 
    downloadPDF, 
    previewPDF, 
    clearError 
  } = useModernPDF();
  
  const { validateDocument } = useDocumentValidation();

  // Estado local
  const [documentData, setDocumentData] = useState<DocumentData>({
    title: initialData?.title || 'Documento PDF',
    subtitle: initialData?.subtitle || '',
    content: initialData?.content || [
      {
        type: 'text',
        data: 'Este é um exemplo de conteúdo do documento PDF gerado com cores vibrantes e design moderno.',
      }
    ],
    metadata: {
      author: 'Sistema Moderno',
      subject: 'Documento Gerado Automaticamente',
      keywords: ['pdf', 'moderno', 'vibrante'],
      ...initialData?.metadata,
    },
    whatsappConfig: {
      phoneNumber: '+5511999999999',
      message: 'Olá! Gostaria de mais informações sobre este documento.',
      buttonText: 'Contatar via WhatsApp',
      ...initialData?.whatsappConfig,
    },
  });

  const [options, setOptions] = useState<GenerationOptions>({
    pageFormat: 'A4',
    colorScheme: 'vibrant',
    includeWatermark: false,
    quality: 'high',
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);

  // Handlers
  const handleInputChange = useCallback((field: keyof DocumentData, value: any) => {
    setDocumentData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleWhatsAppChange = useCallback((field: string, value: string) => {
    setDocumentData(prev => ({
      ...prev,
      whatsappConfig: {
        ...prev.whatsappConfig!,
        [field]: value,
      },
    }));
  }, []);

  const handleMetadataChange = useCallback((field: string, value: string) => {
    setDocumentData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata!,
        [field]: value,
      },
    }));
  }, []);

  const handleAddContent = useCallback((type: 'text') => {
    const newContent = { type: 'text' as const, data: 'Novo texto...' };

    setDocumentData(prev => ({
      ...prev,
      content: Array.isArray(prev.content) 
        ? [...prev.content, newContent]
        : typeof prev.content === 'string' 
          ? [{ type: 'text' as const, data: prev.content }, newContent]
          : [newContent],
    }));
  }, []);

  const handleRemoveContent = useCallback((index: number) => {
    setDocumentData(prev => ({
      ...prev,
      content: Array.isArray(prev.content) 
        ? prev.content.filter((_, i) => i !== index)
        : prev.content, // Se for string, não remove
    }));
  }, []);

  const handleGenerate = useCallback(async () => {
    try {
      clearError();
      
      // Validação
      const validation = validateDocument(documentData);
      if (!validation.isValid) {
        const errorMsg = `Dados inválidos: ${validation.errors.join(', ')}`;
        onError?.(errorMsg);
        return;
      }

      const blob = await generatePDF(documentData, options);
      if (blob) {
        onGenerated?.(blob);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro na geração';
      onError?.(errorMsg);
    }
  }, [documentData, options, generatePDF, validateDocument, clearError, onGenerated, onError]);

  const handleDownload = useCallback(async () => {
    try {
      await downloadPDF(documentData, `${documentData.title}.pdf`, options);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro no download';
      onError?.(errorMsg);
    }
  }, [documentData, options, downloadPDF, onError]);

  const handlePreview = useCallback(async () => {
    try {
      const url = await previewPDF(documentData, options);
      if (url) {
        setPreviewUrl(url);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro no preview';
      onError?.(errorMsg);
    }
  }, [documentData, options, previewPDF, onError]);

  // Validação em tempo real
  const validation = validateDocument(documentData);

  return (
    <div className={`space-y-6 p-6 bg-white rounded-lg shadow-lg ${className}`}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Gerador de PDF Moderno</h2>
        </div>
        <div className="flex items-center space-x-2">
          {validation.isValid ? (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Válido
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertCircle className="h-3 w-3 mr-1" />
              {validation.errors.length} erro(s)
            </Badge>
          )}
        </div>
      </div>

      {/* Erro global */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-800">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ✕
            </Button>
          </div>
        </div>
      )}

      {/* Configurações básicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Título do Documento</Label>
          <Input
            id="title"
            value={documentData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Digite o título..."
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="subtitle">Subtítulo (Opcional)</Label>
          <Input
            id="subtitle"
            value={documentData.subtitle || ''}
            onChange={(e) => handleInputChange('subtitle', e.target.value)}
            placeholder="Digite o subtítulo..."
            className="w-full"
          />
        </div>
      </div>

      {/* Configuração do WhatsApp */}
      <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-md">
        <div className="flex items-center space-x-2">
          <Smartphone className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold text-green-800">Configuração do WhatsApp</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp-phone">Número do WhatsApp</Label>
            <Input
              id="whatsapp-phone"
              value={documentData.whatsappConfig?.phoneNumber || ''}
              onChange={(e) => handleWhatsAppChange('phoneNumber', e.target.value)}
              placeholder="+5511999999999"
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="whatsapp-button">Texto do Botão</Label>
            <Input
              id="whatsapp-button"
              value={documentData.whatsappConfig?.buttonText || ''}
              onChange={(e) => handleWhatsAppChange('buttonText', e.target.value)}
              placeholder="Contatar via WhatsApp"
              className="w-full"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="whatsapp-message">Mensagem Padrão</Label>
          <Input
            id="whatsapp-message"
            value={documentData.whatsappConfig?.message || ''}
            onChange={(e) => handleWhatsAppChange('message', e.target.value)}
            placeholder="Olá! Gostaria de mais informações..."
            className="w-full"
          />
        </div>
      </div>

      {/* Configurações avançadas */}
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center space-x-2"
        >
          <Settings className="h-4 w-4" />
          <span>Configurações Avançadas</span>
        </Button>

        {showAdvanced && (
          <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="page-format">Formato da Página</Label>
                <select
                  id="page-format"
                  value={options.pageFormat}
                  onChange={(e) => setOptions(prev => ({ ...prev, pageFormat: e.target.value as any }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="A4">A4</option>
                  <option value="Letter">Letter</option>
                  <option value="Legal">Legal</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color-scheme">Esquema de Cores</Label>
                <select
                  id="color-scheme"
                  value={typeof options.colorScheme === 'string' ? options.colorScheme : 'default'}
                  onChange={(e) => setOptions(prev => ({ ...prev, colorScheme: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="light">Claro</option>
                  <option value="dark">Escuro</option>
                  <option value="vibrant">Vibrante</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quality">Qualidade</Label>
                <select
                  id="quality"
                  value={options.quality}
                  onChange={(e) => setOptions(prev => ({ ...prev, quality: e.target.value as any }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="standard">Padrão</option>
                  <option value="high">Alta</option>
                  <option value="print">Impressão</option>
                </select>
              </div>
            </div>

            {/* Metadados */}
            <Separator />
            <div className="space-y-4">
              <h4 className="text-md font-semibold">Metadados do Documento</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="author">Autor</Label>
                  <Input
                    id="author"
                    value={documentData.metadata?.author || ''}
                    onChange={(e) => handleMetadataChange('author', e.target.value)}
                    placeholder="Nome do autor"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Assunto</Label>
                  <Input
                    id="subject"
                    value={documentData.metadata?.subject || ''}
                    onChange={(e) => handleMetadataChange('subject', e.target.value)}
                    placeholder="Assunto do documento"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Indicador de progresso */}
      {isGenerating && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Gerando PDF...</span>
            <span className="text-sm text-gray-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !validation.isValid}
          className="flex items-center space-x-2"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          <span>Gerar PDF</span>
        </Button>

        <Button
          variant="outline"
          onClick={handleDownload}
          disabled={isGenerating || !validation.isValid}
          className="flex items-center space-x-2"
        >
          <Download className="h-4 w-4" />
          <span>Download</span>
        </Button>

        <Button
          variant="outline"
          onClick={handlePreview}
          disabled={isGenerating || !validation.isValid}
          className="flex items-center space-x-2"
        >
          <Eye className="h-4 w-4" />
          <span>Preview</span>
        </Button>

        <Button
          variant="ghost"
          onClick={() => {
            setDocumentData({
              title: 'Documento PDF',
              subtitle: '',
              content: [{ type: 'text', data: 'Conteúdo exemplo...' }],
              metadata: { author: 'Sistema Moderno' },
              whatsappConfig: {
                phoneNumber: '+5511999999999',
                message: 'Olá! Gostaria de mais informações.',
                buttonText: 'Contatar via WhatsApp',
              },
            });
            setPreviewUrl(null);
          }}
          className="flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Resetar</span>
        </Button>
      </div>

      {/* Preview */}
      {previewUrl && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Preview do PDF</h3>
          <div className="border border-gray-300 rounded-md overflow-hidden">
            <iframe
              ref={previewRef}
              src={previewUrl}
              className="w-full h-96"
              title="Preview do PDF"
            />
          </div>
        </div>
      )}

      {/* Paleta de cores (informativa) */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-center space-x-2 mb-3">
          <Palette className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-blue-800">Esquema de Cores Vibrantes</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ColorScheme).slice(0, 8).map(([name, color]) => (
            <div key={name} className="flex items-center space-x-2">
              <div 
                className="w-6 h-6 rounded border border-gray-300"
                style={{ backgroundColor: Array.isArray(color) ? color[0] : color }}
              />
              <span className="text-sm text-gray-600 capitalize">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ModernPDFGenerator;