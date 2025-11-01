/**
 * Página de Demonstração do Gerador de PDF Moderno
 * 
 * Esta página demonstra todas as funcionalidades do novo sistema:
 * - Cores vibrantes e acessíveis
 * - Links clicáveis para WhatsApp
 * - Layout responsivo
 * - Metadados completos
 * - Tratamento de erros
 */

'use client';

import React, { useState } from 'react';
import { ModernPDFGenerator } from '@/components/modern-pdf-generator';
import { DocumentData } from '@/lib/pdf-generators/modern-pdf-generator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Palette, 
  Smartphone, 
  Shield, 
  Zap, 
  CheckCircle,
  Star,
  Download,
  Eye
} from 'lucide-react';

export default function DemoPDFPage() {
  const [selectedDemo, setSelectedDemo] = useState<string>('business');
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);

  // Dados de demonstração
  const demoData: Record<string, DocumentData> = {
    business: {
      title: 'Proposta Comercial - Empresa XYZ',
      subtitle: 'Soluções Digitais Inovadoras',
      content: [
        {
          type: 'text',
          data: 'Apresentamos nossa proposta comercial para desenvolvimento de soluções digitais personalizadas para sua empresa. Nossa equipe especializada está pronta para transformar suas ideias em realidade.',
        },
        {
          type: 'table',
          data: {
            headers: ['Serviço', 'Prazo', 'Investimento'],
            rows: [
              ['Desenvolvimento Web', '30 dias', 'R$ 15.000'],
              ['App Mobile', '45 dias', 'R$ 25.000'],
              ['Consultoria Digital', '15 dias', 'R$ 8.000'],
              ['Manutenção Mensal', 'Contínuo', 'R$ 2.500/mês'],
            ],
          },
        },
        {
          type: 'text',
          data: 'Todos os nossos projetos incluem garantia de 6 meses, suporte técnico especializado e documentação completa. Entre em contato conosco para discutir os detalhes da sua proposta.',
        },
      ],
      metadata: {
        author: 'Empresa XYZ - Soluções Digitais',
        subject: 'Proposta Comercial para Desenvolvimento Digital',
        keywords: ['proposta', 'desenvolvimento', 'digital', 'web', 'mobile'],
      },
      whatsappConfig: {
        phoneNumber: '+5511987654321',
        message: 'Olá! Vi a proposta comercial e gostaria de conversar sobre os serviços de desenvolvimento digital.',
        buttonText: 'Falar com Consultor',
      },
    },
    
    report: {
      title: 'Relatório de Vendas - Janeiro 2024',
      subtitle: 'Análise de Performance Comercial',
      content: [
        {
          type: 'text',
          data: 'Este relatório apresenta os resultados de vendas do mês de janeiro de 2024, incluindo análise de performance por produto, região e canal de vendas.',
        },
        {
          type: 'table',
          data: {
            headers: ['Produto', 'Unidades Vendidas', 'Receita', 'Crescimento'],
            rows: [
              ['Produto Premium', '1.250', 'R$ 125.000', '+15%'],
              ['Produto Standard', '2.100', 'R$ 84.000', '+8%'],
              ['Produto Básico', '3.500', 'R$ 70.000', '+12%'],
              ['Serviços', '450', 'R$ 67.500', '+22%'],
            ],
          },
        },
        {
          type: 'text',
          data: 'O mês de janeiro apresentou crescimento consistente em todas as categorias, com destaque para o segmento de serviços que cresceu 22% em relação ao mesmo período do ano anterior.',
        },
      ],
      metadata: {
        author: 'Departamento Comercial',
        subject: 'Relatório Mensal de Vendas',
        keywords: ['vendas', 'relatório', 'performance', 'janeiro', '2024'],
      },
      whatsappConfig: {
        phoneNumber: '+5511999887766',
        message: 'Olá! Gostaria de discutir os resultados do relatório de vendas de janeiro.',
        buttonText: 'Contatar Gerente',
      },
    },
    
    invoice: {
      title: 'Fatura #2024-001',
      subtitle: 'Serviços de Consultoria Digital',
      content: [
        {
          type: 'text',
          data: 'Fatura referente aos serviços de consultoria digital prestados no período de 01/01/2024 a 31/01/2024.',
        },
        {
          type: 'table',
          data: {
            headers: ['Descrição', 'Quantidade', 'Valor Unit.', 'Total'],
            rows: [
              ['Consultoria Estratégica', '20h', 'R$ 200/h', 'R$ 4.000'],
              ['Desenvolvimento Frontend', '40h', 'R$ 150/h', 'R$ 6.000'],
              ['Testes e QA', '15h', 'R$ 120/h', 'R$ 1.800'],
              ['Documentação', '10h', 'R$ 100/h', 'R$ 1.000'],
            ],
          },
        },
        {
          type: 'text',
          data: 'Total Geral: R$ 12.800,00\nVencimento: 15/02/2024\nForma de Pagamento: Transferência bancária ou PIX',
        },
      ],
      metadata: {
        author: 'Consultoria Digital Ltda',
        subject: 'Fatura de Serviços - Janeiro 2024',
        keywords: ['fatura', 'consultoria', 'digital', 'pagamento'],
      },
      whatsappConfig: {
        phoneNumber: '+5511888777666',
        message: 'Olá! Tenho dúvidas sobre a fatura #2024-001. Podemos conversar?',
        buttonText: 'Falar sobre Fatura',
      },
    },
  };

  const demoOptions = [
    {
      id: 'business',
      title: 'Proposta Comercial',
      description: 'Documento profissional com tabela de preços e call-to-action',
      icon: <FileText className="h-5 w-5" />,
      color: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'report',
      title: 'Relatório de Vendas',
      description: 'Relatório com dados tabulares e análise de performance',
      icon: <Star className="h-5 w-5" />,
      color: 'bg-green-100 text-green-800',
    },
    {
      id: 'invoice',
      title: 'Fatura de Serviços',
      description: 'Documento fiscal com detalhamento de serviços',
      icon: <Shield className="h-5 w-5" />,
      color: 'bg-purple-100 text-purple-800',
    },
  ];

  const features = [
    {
      icon: <Palette className="h-6 w-6 text-blue-600" />,
      title: 'Cores Vibrantes',
      description: 'Esquema de cores moderno com contraste WCAG AA compliant para máxima legibilidade.',
    },
    {
      icon: <Smartphone className="h-6 w-6 text-green-600" />,
      title: 'Link WhatsApp',
      description: 'Botões clicáveis que redirecionam diretamente para conversas no WhatsApp.',
    },
    {
      icon: <Zap className="h-6 w-6 text-yellow-600" />,
      title: 'Layout Responsivo',
      description: 'Design que se adapta automaticamente a diferentes formatos e tamanhos de página.',
    },
    {
      icon: <Shield className="h-6 w-6 text-red-600" />,
      title: 'Tratamento de Erros',
      description: 'Sistema robusto de validação e tratamento de erros com mensagens claras.',
    },
  ];

  const handleBlobGenerated = (blob: Blob) => {
    setGeneratedBlob(blob);
  };

  const handleDownloadDemo = () => {
    if (generatedBlob) {
      const url = URL.createObjectURL(generatedBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `demo-${selectedDemo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handlePreviewDemo = () => {
    if (generatedBlob) {
      const url = URL.createObjectURL(generatedBlob);
      window.open(url, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Cabeçalho */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <FileText className="h-12 w-12 text-blue-600 mr-4" />
            <h1 className="text-4xl font-bold text-gray-900">
              Gerador de PDF Moderno
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Sistema avançado de geração de PDFs com cores vibrantes, links clicáveis para WhatsApp, 
            layout responsivo e funcionalidades modernas.
          </p>
        </div>

        {/* Características */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-3">
                {feature.icon}
                <h3 className="text-lg font-semibold ml-3">{feature.title}</h3>
              </div>
              <p className="text-gray-600 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Seletor de Demonstração */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Escolha uma Demonstração</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {demoOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedDemo(option.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedDemo === option.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center mb-2">
                  {option.icon}
                  <h3 className="text-lg font-semibold ml-2">{option.title}</h3>
                </div>
                <p className="text-sm text-gray-600 text-left">{option.description}</p>
                <Badge className={`mt-2 ${option.color}`}>
                  {selectedDemo === option.id ? 'Selecionado' : 'Clique para selecionar'}
                </Badge>
              </button>
            ))}
          </div>

          {/* Ações rápidas */}
          {generatedBlob && (
            <div className="flex gap-3 mb-6">
              <Button onClick={handleDownloadDemo} className="flex items-center space-x-2">
                <Download className="h-4 w-4" />
                <span>Download PDF</span>
              </Button>
              <Button variant="outline" onClick={handlePreviewDemo} className="flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>Visualizar</span>
              </Button>
            </div>
          )}

          <Separator className="my-6" />

          {/* Gerador de PDF */}
          <ModernPDFGenerator
            initialData={demoData[selectedDemo]}
            onGenerated={handleBlobGenerated}
            onError={(error) => console.error('Erro na demonstração:', error)}
            className="border-0 shadow-none p-0"
          />
        </div>

        {/* Informações Técnicas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Especificações */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Especificações Técnicas</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span>Biblioteca: PDFKit + Chroma.js</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span>Contraste: WCAG AA Compliant</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span>Formatos: A4, Letter, Legal</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span>Qualidade: Padrão, Alta, Impressão</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span>Metadados: Título, Autor, Palavras-chave</span>
              </div>
            </div>
          </div>

          {/* Paleta de Cores */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Paleta de Cores Vibrantes</h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { name: 'Primary', color: '#2563eb' },
                { name: 'Secondary', color: '#7c3aed' },
                { name: 'Accent', color: '#059669' },
                { name: 'Success', color: '#16a34a' },
                { name: 'Warning', color: '#d97706' },
                { name: 'Error', color: '#dc2626' },
                { name: 'Info', color: '#0ea5e9' },
                { name: 'Text', color: '#0f172a' },
              ].map((item) => (
                <div key={item.name} className="text-center">
                  <div
                    className="w-full h-12 rounded-md border border-gray-200 mb-2"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-gray-600">{item.name}</span>
                  <div className="text-xs text-gray-400 font-mono">{item.color}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="text-center py-8 border-t border-gray-200">
          <p className="text-gray-600">
            Gerador de PDF Moderno v2.0.0 - Desenvolvido com React, TypeScript e PDFKit
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Todas as funcionalidades incluem testes unitários e documentação completa
          </p>
        </div>
      </div>
    </div>
  );
}