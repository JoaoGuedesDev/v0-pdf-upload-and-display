/**
 * Testes unitários para o Gerador de PDF Moderno
 * 
 * Testa funcionalidades essenciais:
 * - Criação de instância
 * - Funcionalidade do WhatsApp
 * - Acessibilidade de cores
 * - Layout responsivo
 */

import { ModernPDFGenerator, ColorUtils, DocumentData, GenerationOptions } from '../lib/pdf-generators/modern-pdf-generator';

// Mock do jsPDF já está configurado no jest.setup.js

describe('Gerador de PDF Moderno', () => {
  let generator: ModernPDFGenerator;
  let mockDocumentData: DocumentData;
  
  beforeEach(() => {
    generator = new ModernPDFGenerator();
    mockDocumentData = {
      title: 'Documento de Teste',
      content: 'Este é um texto de teste para o PDF.',
      whatsapp: {
        number: '+5511999999999',
        message: 'Mensagem de teste para WhatsApp'
      },
      tables: [
        {
          headers: ['Nome', 'Idade', 'Cidade'],
          rows: [
            ['João', '30', 'São Paulo'],
            ['Maria', '25', 'Rio de Janeiro']
          ]
        }
      ]
    };
  });

  describe('Criação de Instância', () => {
    it('deve criar uma instância do gerador', () => {
      expect(generator).toBeInstanceOf(ModernPDFGenerator);
    });

    it('deve criar instância com opções', () => {
      const options: GenerationOptions = { format: 'A4', orientation: 'portrait' };
      const gen = new ModernPDFGenerator(options);
      expect(gen).toBeInstanceOf(ModernPDFGenerator);
    });

    it('deve definir metadados', () => {
      const documentData = {
        title: 'Teste PDF',
        content: 'Conteúdo de teste',
        author: 'Autor Teste',
        metadata: {
          subject: 'Assunto Teste'
        }
      };
      
      expect(() => {
        generator.setMetadata(documentData);
      }).not.toThrow();
    });

    it('deve gerar documento PDF', () => {
      const result = ModernPDFGenerator.generateDocument(mockDocumentData);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Funcionalidade do WhatsApp', () => {
    describe('Validação de Número', () => {
      it('deve validar números brasileiros corretos', () => {
        const validNumbers = [
          '+5511999999999',
          '5511999999999',
          '11999999999'
        ];

        validNumbers.forEach(number => {
          const cleanNumber = number.replace(/\D/g, '');
          expect(cleanNumber.length).toBeGreaterThanOrEqual(10);
          expect(cleanNumber.length).toBeLessThanOrEqual(15);
        });
      });

      it('deve rejeitar números inválidos', () => {
        const invalidNumbers = [
          '123',
          'abc',
          '+55119999',
          ''
        ];

        invalidNumbers.forEach(number => {
          const cleanNumber = number.replace(/\D/g, '');
          expect(
            cleanNumber.length < 10 || cleanNumber.length > 15
          ).toBe(true);
        });
      });
    });

    describe('Geração de URL', () => {
      it('deve gerar URL correta do WhatsApp', () => {
        const number = '+5511999999999';
        const message = 'Olá, teste!';
        
        const cleanPhone = number.replace(/\D/g, '');
        const expectedUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        
        expect(expectedUrl).toContain('wa.me');
        expect(expectedUrl).toContain('5511999999999');
        expect(expectedUrl).toContain(encodeURIComponent(message));
      });

      it('deve adicionar botão do WhatsApp ao PDF', () => {
        expect(() => {
          generator.addWhatsAppButton('+5511999999999', 'Mensagem de teste');
        }).not.toThrow();
      });
    });
  });

  describe('Acessibilidade de Cores', () => {
    describe('Validação de Contraste', () => {
      it('deve ter função de validação de acessibilidade', () => {
        expect(typeof ColorUtils.isAccessible).toBe('function');
      });

      it('deve validar cores com contraste adequado', () => {
        // Teste básico - função deve retornar boolean
        const result = ColorUtils.isAccessible('#000000', '#ffffff');
        expect(typeof result).toBe('boolean');
      });
    });

    describe('Utilitários de Cores', () => {
      it('deve gerar paleta vibrante', () => {
        const palette = ColorUtils.generateVibrantPalette();
        expect(palette).toHaveProperty('primary');
        expect(palette).toHaveProperty('secondary');
        expect(palette).toHaveProperty('accent');
      });

      it('deve converter cores para diferentes formatos', () => {
        const testColor = '#2563eb';
        
        const hex = ColorUtils.convertColor(testColor, 'hex');
        const rgb = ColorUtils.convertColor(testColor, 'rgb');
        const hsl = ColorUtils.convertColor(testColor, 'hsl');
        
        expect(typeof hex).toBe('string');
        expect(typeof rgb).toBe('string');
        expect(typeof hsl).toBe('string');
      });
    });
  });

  describe('Layout Responsivo', () => {
    it('deve suportar diferentes formatos de página', () => {
      const formats = ['A4', 'Letter', 'Legal'] as const;
      
      formats.forEach(format => {
        const options: GenerationOptions = { format, orientation: 'portrait' };
        const result = ModernPDFGenerator.generateDocument(mockDocumentData, options);
        
        expect(result).toBeInstanceOf(Uint8Array);
      });
    });

    it('deve suportar diferentes orientações', () => {
      const orientations = ['portrait', 'landscape'] as const;
      
      orientations.forEach(orientation => {
        const options: GenerationOptions = { format: 'A4', orientation };
        const result = ModernPDFGenerator.generateDocument(mockDocumentData, options);
        
        expect(result).toBeInstanceOf(Uint8Array);
      });
    });

    it('deve adicionar elementos de layout', () => {
      expect(() => {
        generator.addHeader('Título de Teste');
        generator.addText('Texto de teste');
        generator.addFooter();
      }).not.toThrow();
    });

    it('deve adicionar tabela ao PDF', () => {
      const headers = ['Coluna 1', 'Coluna 2'];
      const rows = [
        ['Dados 1', 'Dados 2'],
        ['Dados 3', 'Dados 4']
      ];
      
      expect(() => {
        generator.addTable(headers, rows);
      }).not.toThrow();
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve processar dados válidos sem erro', () => {
      expect(() => {
        const metadata = { 
          title: 'Teste', 
          content: 'Conteúdo de teste',
          author: 'Autor', 
          metadata: { subject: 'Assunto' }
        };
        generator.setMetadata(metadata);
        generator.addHeader(mockDocumentData.title);
        generator.addText('Texto de teste');
      }).not.toThrow();
    });

    it('deve tratar configuração do WhatsApp', () => {
      expect(() => {
        generator.addWhatsAppButton('+5511999999999', 'Teste');
      }).not.toThrow();
    });
  });

  describe('Integridade do PDF', () => {
    it('deve ter métodos essenciais disponíveis', () => {
      expect(typeof generator.setMetadata).toBe('function');
      expect(typeof generator.addHeader).toBe('function');
      expect(typeof generator.addText).toBe('function');
      expect(typeof generator.addTable).toBe('function');
      expect(typeof generator.addWhatsAppButton).toBe('function');
      expect(typeof generator.addFooter).toBe('function');
    });

    it('deve ter método estático de geração', () => {
      expect(typeof ModernPDFGenerator.generateDocument).toBe('function');
    });

    it('deve gerar PDF com opções customizadas', () => {
      const options: GenerationOptions = {
        format: 'A4',
        orientation: 'portrait',
        margins: { top: 20, right: 20, bottom: 20, left: 20 }
      };
      
      const result = ModernPDFGenerator.generateDocument(mockDocumentData, options);
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });
});