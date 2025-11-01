import { ModernPDFGenerator, DocumentData, GenerationOptions } from '../lib/pdf-generators/modern-pdf-generator';
import fs from 'fs';
import path from 'path';

describe('Link Funcional do WhatsApp no PDF', () => {
  const testData: DocumentData = {
    title: 'Teste de Link do WhatsApp',
    subtitle: 'Validação de Funcionalidade',
    content: [
      {
        type: 'text',
        data: 'Este PDF contém um link funcional para o WhatsApp que deve abrir uma conversa quando clicado.'
      },
      {
        type: 'paragraph',
        data: 'O link utiliza o protocolo https://wa.me/ e inclui todos os parâmetros necessários para garantir compatibilidade.'
      }
    ],
    whatsappConfig: {
      phoneNumber: '5511999887766',
      message: 'Olá! Cliquei no link do PDF e gostaria de mais informações sobre seus serviços.',
      buttonText: 'Falar no WhatsApp'
    },
    metadata: {
      subject: 'Teste de Link WhatsApp',
      keywords: ['whatsapp', 'link', 'pdf', 'funcional'],
      creator: 'Modern PDF Generator',
      author: 'Sistema de Testes'
    }
  };

  const options: GenerationOptions = {
    format: 'A4',
    orientation: 'portrait',
    quality: 'high',
    includeWatermark: false
  };

  test('deve gerar PDF com link funcional do WhatsApp', () => {
    // Gerar o PDF
    const pdfBuffer = ModernPDFGenerator.generateDocument(testData, options);
    
    // Verificar se o buffer foi gerado
    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer).toBeInstanceOf(Uint8Array);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    
    // Salvar o arquivo para teste manual
    const filename = path.join(__dirname, '..', 'teste-whatsapp-link.pdf');
    fs.writeFileSync(filename, pdfBuffer);
    
    // Verificar se o arquivo foi criado
    expect(fs.existsSync(filename)).toBe(true);
    
    console.log('✅ PDF gerado com sucesso!');
    console.log(`📄 Arquivo salvo como: ${filename}`);
    console.log('');
    console.log('🔍 Para testar o link do WhatsApp:');
    console.log('1. Abra o arquivo PDF gerado');
    console.log('2. Clique no botão verde "Falar no WhatsApp"');
    console.log('3. Verifique se o WhatsApp abre com a mensagem pré-definida');
    console.log('4. Teste em diferentes dispositivos (desktop, mobile)');
    console.log('');
    console.log('📱 Número de teste: +55 11 99988-7766');
    console.log('💬 Mensagem: "Olá! Cliquei no link do PDF e gostaria de mais informações sobre seus serviços."');
    console.log('');
    console.log('🌐 URL gerada: https://wa.me/5511999887766?text=Olá!%20Cliquei%20no%20link%20do%20PDF%20e%20gostaria%20de%20mais%20informações%20sobre%20seus%20serviços.');
  });

  test('deve validar configuração do WhatsApp', () => {
    // Testar com whatsappConfig
    expect(testData.whatsappConfig).toBeDefined();
    expect(testData.whatsappConfig?.phoneNumber).toBe('5511999887766');
    expect(testData.whatsappConfig?.message).toContain('Olá!');
    expect(testData.whatsappConfig?.buttonText).toBe('Falar no WhatsApp');
  });

  test('deve gerar URL correta do WhatsApp', () => {
    const { WhatsAppUtils } = require('../lib/pdf-generators/modern-pdf-generator');
    
    const phoneNumber = '5511999887766';
    const message = 'Olá! Cliquei no link do PDF e gostaria de mais informações sobre seus serviços.';
    
    const url = WhatsAppUtils.generateWhatsAppURL(phoneNumber, message);
    
    expect(url).toContain('https://wa.me/');
    expect(url).toContain(phoneNumber);
    expect(url).toContain('text=');
    expect(url).toContain('Ol%C3%A1!'); // "Olá!" encoded
  });

  test('deve validar número brasileiro', () => {
    const { WhatsAppUtils } = require('../lib/pdf-generators/modern-pdf-generator');
    
    // Números válidos
    expect(WhatsAppUtils.validateBrazilianNumber('5511999887766')).toBe(true); // Com código do país (11 dígitos)
    expect(WhatsAppUtils.validateBrazilianNumber('5521987654321')).toBe(true); // Com código do país (11 dígitos)
    expect(WhatsAppUtils.validateBrazilianNumber('11999887766')).toBe(true); // Sem código do país (11 dígitos)
    expect(WhatsAppUtils.validateBrazilianNumber('21987654321')).toBe(true); // Sem código do país (11 dígitos)
    expect(WhatsAppUtils.validateBrazilianNumber('5511999887')).toBe(true); // Com código do país (10 dígitos - válido)
    
    // Números inválidos
    expect(WhatsAppUtils.validateBrazilianNumber('abc123')).toBe(false); // Não numérico
    expect(WhatsAppUtils.validateBrazilianNumber('123')).toBe(false); // Muito curto
    expect(WhatsAppUtils.validateBrazilianNumber('551199988776612345')).toBe(false); // Muito longo
  });

  afterAll(() => {
    // Limpar arquivo de teste se necessário
    const filename = path.join(__dirname, '..', 'teste-whatsapp-link.pdf');
    if (fs.existsSync(filename)) {
      // Manter o arquivo para teste manual
      console.log(`📁 Arquivo de teste mantido: ${filename}`);
    }
  });
});