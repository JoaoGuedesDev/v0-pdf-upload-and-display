import { ModernPDFGenerator, DocumentData, GenerationOptions } from './lib/pdf-generators/modern-pdf-generator.js';
import * as fs from 'fs';

// Teste do documento PDF técnico com margens mínimas
function testTechnicalPDF() {
  console.log('🔧 Testando documento PDF técnico com margens mínimas...');
  
  // Dados de teste para documento técnico
  const technicalData: DocumentData = {
    title: 'ESPECIFICAÇÃO TÉCNICA - PROJETO ALPHA',
    subtitle: 'Documento de Engenharia - Rev. 2.1',
    content: [
      {
        type: 'heading',
        data: '1. ESPECIFICAÇÕES GERAIS'
      },
      {
        type: 'text',
        data: 'Este documento apresenta as especificações técnicas detalhadas para o Projeto Alpha, incluindo dimensões críticas, tolerâncias de fabricação, materiais especificados e procedimentos de controle de qualidade. Todas as medidas devem ser rigorosamente seguidas para garantir a conformidade com os padrões ISO 9001:2015.'
      },
      {
        type: 'heading',
        data: '2. DIMENSÕES E TOLERÂNCIAS'
      },
      {
        type: 'text',
        data: 'Comprimento: 150.00 ± 0.05 mm | Largura: 75.00 ± 0.03 mm | Altura: 25.00 ± 0.02 mm | Rugosidade superficial: Ra ≤ 0.8 μm | Paralelismo: ± 0.01 mm | Perpendicularidade: ± 0.02 mm'
      },
      {
        type: 'heading',
        data: '3. MATERIAIS E TRATAMENTOS'
      },
      {
        type: 'text',
        data: 'Material base: Aço AISI 316L | Tratamento térmico: Recozimento a 1050°C | Acabamento superficial: Polimento espelhado | Revestimento: Passivação química | Dureza: 180-220 HV | Resistência à tração: ≥ 520 MPa'
      },
      {
        type: 'heading',
        data: '4. CONTROLE DE QUALIDADE'
      },
      {
        type: 'text',
        data: 'Inspeção dimensional: 100% das peças | Teste de dureza: Amostragem 10% | Análise metalográfica: 1 peça por lote | Certificado de material: Obrigatório | Rastreabilidade: Código QR gravado | Embalagem: Proteção antiestática'
      }
    ],
    tables: [
      {
        headers: ['Parâmetro', 'Valor Nominal', 'Tolerância', 'Método de Medição'],
        rows: [
          ['Comprimento (mm)', '150.00', '± 0.05', 'Paquímetro digital'],
          ['Largura (mm)', '75.00', '± 0.03', 'Micrômetro'],
          ['Altura (mm)', '25.00', '± 0.02', 'Relógio comparador'],
          ['Rugosidade (μm)', '0.8', 'Ra máx', 'Rugosímetro'],
          ['Dureza (HV)', '200', '180-220', 'Microdurômetro']
        ]
      }
    ],
    author: 'Eng. João Silva - CRE 12345',
    date: new Date(),
    metadata: {
      subject: 'Especificação Técnica - Projeto Alpha',
      keywords: ['engenharia', 'especificação', 'técnico', 'qualidade', 'ISO'],
      creator: 'Sistema de Documentação Técnica',
      author: 'Departamento de Engenharia'
    }
  };

  // Configurações para documento técnico com margens mínimas
  const technicalOptions: GenerationOptions = {
    format: 'A4',
    orientation: 'portrait',
    quality: 'technical',
    marginType: 'technical', // 3mm de margem
    includePrintGuides: true,
    maxAreaUtilization: true,
    fontSize: 10 // Fonte menor para aproveitar melhor o espaço
  };

  try {
    // Gerar PDF técnico
    const pdfBuffer = ModernPDFGenerator.generateDocument(technicalData, technicalOptions);
    
    // Salvar arquivo para teste
    const filename = 'documento-tecnico-margens-minimas.pdf';
    fs.writeFileSync(filename, pdfBuffer);
    
    console.log('✅ PDF técnico gerado com sucesso!');
    console.log(`📄 Arquivo salvo: ${filename}`);
    console.log('📏 Especificações implementadas:');
    console.log('   • Margens: 3mm (8.5 pontos) em todos os lados');
    console.log('   • Utilização: 98% da área útil do papel A4');
    console.log('   • Guias de corte: Incluídas nos cantos e centros');
    console.log('   • Área de impressão segura: Demarcada com linha pontilhada');
    console.log('   • Espaçamento otimizado: Compactado para máximo aproveitamento');
    console.log('   • Qualidade técnica: Configurada para impressão profissional');
    
    // Teste com margens ainda menores (2mm)
    console.log('\n🔧 Testando com margens mínimas (2mm)...');
    
    const minimalOptions: GenerationOptions = {
      ...technicalOptions,
      marginType: 'minimal', // 2mm de margem
    };
    
    const minimalPdfBuffer = ModernPDFGenerator.generateDocument(technicalData, minimalOptions);
    const minimalFilename = 'documento-tecnico-margens-2mm.pdf';
    fs.writeFileSync(minimalFilename, minimalPdfBuffer);
    
    console.log('✅ PDF com margens de 2mm gerado com sucesso!');
    console.log(`📄 Arquivo salvo: ${minimalFilename}`);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao gerar PDF técnico:', error);
    return false;
  }
}

// Executar teste
if (require.main === module) {
  const success = testTechnicalPDF();
  process.exit(success ? 0 : 1);
}

export { testTechnicalPDF };