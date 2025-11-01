# Gerador de PDF Moderno

Um sistema completo e moderno para geração de PDFs com cores vibrantes, links clicáveis para WhatsApp, layout responsivo e funcionalidades avançadas.

## 📋 Índice

- [Características](#características)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso Básico](#uso-básico)
- [API Reference](#api-reference)
- [Exemplos](#exemplos)
- [Testes](#testes)
- [Troubleshooting](#troubleshooting)

## ✨ Características

### 🎨 Design Moderno
- **Esquema de cores vibrantes** com contraste WCAG AA compliant
- **Layout responsivo** que se adapta a diferentes tamanhos
- **Tipografia otimizada** com hierarquia visual clara
- **Elementos decorativos** como gradientes e linhas

### 📱 Integração WhatsApp
- **Botões clicáveis** que redirecionam para WhatsApp
- **Validação de números** de telefone internacionais
- **Mensagens personalizáveis** com encoding automático
- **Design consistente** com a identidade do WhatsApp

### 🔧 Funcionalidades Técnicas
- **Metadados completos** (título, autor, data, palavras-chave)
- **Tratamento robusto de erros** com mensagens descritivas
- **Múltiplos formatos** de página (A4, Letter, Legal)
- **Qualidade configurável** (padrão, alta, impressão)

### ♿ Acessibilidade
- **Contraste de cores** validado automaticamente
- **Cores alternativas** geradas quando necessário
- **Estrutura semântica** adequada
- **Compatibilidade** com leitores de tela

## 🚀 Instalação

### Dependências Necessárias

```bash
npm install pdfkit @types/pdfkit chroma-js @types/chroma-js
```

### Dependências Opcionais (para funcionalidades extras)

```bash
npm install pdfmake  # Para funcionalidades avançadas de layout
```

### Estrutura de Arquivos

```
lib/
├── pdf-generators/
│   └── modern-pdf-generator.ts    # Gerador principal
hooks/
├── use-modern-pdf.ts              # Hook React
components/
├── modern-pdf-generator.tsx       # Componente React
__tests__/
├── modern-pdf-generator.test.ts   # Testes unitários
docs/
└── modern-pdf-generator.md        # Esta documentação
```

## ⚙️ Configuração

### 1. Configuração Básica

```typescript
import { ModernPDFGenerator, DocumentData } from '@/lib/pdf-generators/modern-pdf-generator';

const documentData: DocumentData = {
  title: 'Meu Documento',
  subtitle: 'Subtítulo opcional',
  content: [
    {
      type: 'text',
      data: 'Conteúdo do documento...'
    }
  ],
  whatsappConfig: {
    phoneNumber: '+5511999999999',
    message: 'Olá! Vi seu documento e gostaria de mais informações.',
    buttonText: 'Contatar via WhatsApp'
  }
};
```

### 2. Configuração Avançada

```typescript
import { GenerationOptions } from '@/lib/pdf-generators/modern-pdf-generator';

const options: GenerationOptions = {
  pageFormat: 'A4',           // 'A4' | 'Letter' | 'Legal'
  colorScheme: 'vibrant',     // 'light' | 'dark' | 'vibrant'
  includeWatermark: false,    // Marca d'água opcional
  quality: 'high'             // 'standard' | 'high' | 'print'
};
```

## 📖 Uso Básico

### 1. Geração Simples

```typescript
import { ModernPDFGenerator } from '@/lib/pdf-generators/modern-pdf-generator';

// Geração direta
const buffer = await ModernPDFGenerator.generateDocument(documentData);

// Salvar arquivo
const blob = new Blob([buffer], { type: 'application/pdf' });
const url = URL.createObjectURL(blob);
```

### 2. Usando o Hook React

```typescript
import { useModernPDF } from '@/hooks/use-modern-pdf';

function MyComponent() {
  const { generatePDF, downloadPDF, isGenerating, error } = useModernPDF();

  const handleGenerate = async () => {
    const blob = await generatePDF(documentData);
    if (blob) {
      console.log('PDF gerado com sucesso!');
    }
  };

  const handleDownload = async () => {
    await downloadPDF(documentData, 'meu-documento.pdf');
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? 'Gerando...' : 'Gerar PDF'}
      </button>
      <button onClick={handleDownload}>
        Download PDF
      </button>
      {error && <p>Erro: {error}</p>}
    </div>
  );
}
```

### 3. Usando o Componente Completo

```typescript
import { ModernPDFGenerator } from '@/components/modern-pdf-generator';

function App() {
  return (
    <ModernPDFGenerator
      initialData={{
        title: 'Documento Inicial',
        whatsappConfig: {
          phoneNumber: '+5511999999999',
          message: 'Mensagem padrão'
        }
      }}
      onGenerated={(blob) => console.log('PDF gerado:', blob)}
      onError={(error) => console.error('Erro:', error)}
    />
  );
}
```

## 📚 API Reference

### ModernPDFGenerator

#### Métodos Estáticos

##### `generateDocument(data: DocumentData, options?: GenerationOptions): Promise<Buffer>`

Gera um PDF completo com base nos dados fornecidos.

**Parâmetros:**
- `data`: Dados do documento (título, conteúdo, configurações)
- `options`: Opções de geração (formato, qualidade, etc.)

**Retorna:** Buffer do PDF gerado

#### Métodos de Instância

##### `setMetadata(metadata: DocumentData['metadata']): void`

Define os metadados do documento.

##### `addHeader(title: string, subtitle?: string): void`

Adiciona cabeçalho com título e subtítulo opcional.

##### `addWhatsAppButton(config: DocumentData['whatsappConfig']): void`

Adiciona botão clicável do WhatsApp.

##### `addText(text: string, style?: TextStyle): void`

Adiciona texto com estilo opcional.

##### `addTable(data: string[][], headers?: string[]): void`

Adiciona tabela com dados e cabeçalhos opcionais.

##### `generate(): Promise<Buffer>`

Finaliza e gera o buffer do PDF.

### ColorScheme

Esquema de cores pré-definido com cores vibrantes e acessíveis:

```typescript
export const ColorScheme = {
  primary: '#2563eb',      // Azul vibrante
  secondary: '#7c3aed',    // Roxo vibrante
  accent: '#059669',       // Verde esmeralda
  success: '#16a34a',      // Verde sucesso
  error: '#dc2626',        // Vermelho vibrante
  warning: '#d97706',      // Laranja âmbar
  // ... mais cores
};
```

### ColorUtils

Utilitários para trabalhar com cores:

##### `isAccessible(foreground: string, background: string): boolean`

Verifica se uma combinação de cores tem contraste adequado (WCAG AA).

##### `generateVibrantPalette(baseColor: string, count: number): string[]`

Gera uma paleta de cores vibrantes baseada em uma cor inicial.

##### `convertColor(color: string, format: 'hex' | 'rgb' | 'hsl'): string`

Converte uma cor para diferentes formatos.

### useModernPDF Hook

Hook React para geração de PDF com estado reativo:

```typescript
const {
  // Estado
  isGenerating,     // boolean: PDF sendo gerado
  error,           // string | null: Erro atual
  progress,        // number: Progresso (0-100)
  lastGenerated,   // Date | null: Data da última geração
  
  // Ações
  generatePDF,     // Gera PDF e retorna Blob
  downloadPDF,     // Gera e faz download
  previewPDF,      // Gera e retorna URL para preview
  clearError,      // Limpa erro atual
  reset           // Reseta estado
} = useModernPDF();
```

## 💡 Exemplos

### Exemplo 1: Documento Simples

```typescript
const simpleDocument: DocumentData = {
  title: 'Relatório Mensal',
  subtitle: 'Janeiro 2024',
  content: [
    {
      type: 'text',
      data: 'Este é o relatório mensal de vendas da empresa.'
    },
    {
      type: 'table',
      data: {
        headers: ['Produto', 'Vendas', 'Receita'],
        rows: [
          ['Produto A', '150', 'R$ 15.000'],
          ['Produto B', '200', 'R$ 25.000']
        ]
      }
    }
  ],
  metadata: {
    author: 'Sistema de Relatórios',
    subject: 'Relatório de Vendas',
    keywords: ['vendas', 'relatório', 'mensal']
  }
};
```

### Exemplo 2: Documento com WhatsApp

```typescript
const documentWithWhatsApp: DocumentData = {
  title: 'Proposta Comercial',
  content: [
    {
      type: 'text',
      data: 'Obrigado pelo interesse em nossos serviços!'
    },
    {
      type: 'whatsapp-button',
      data: null
    }
  ],
  whatsappConfig: {
    phoneNumber: '+5511987654321',
    message: 'Olá! Vi a proposta comercial e gostaria de conversar sobre os serviços.',
    buttonText: 'Falar com Vendedor'
  }
};
```

### Exemplo 3: Validação Personalizada

```typescript
import { useDocumentValidation } from '@/hooks/use-modern-pdf';

function DocumentForm() {
  const { validateDocument } = useDocumentValidation();
  const [data, setData] = useState<DocumentData>({...});

  const handleSubmit = () => {
    const validation = validateDocument(data);
    
    if (!validation.isValid) {
      console.error('Erros de validação:', validation.errors);
      return;
    }

    // Prosseguir com a geração
    generatePDF(data);
  };
}
```

## 🧪 Testes

### Executar Testes

```bash
# Todos os testes
npm test

# Testes específicos do PDF
npm test modern-pdf-generator

# Testes com coverage
npm test -- --coverage
```

### Estrutura dos Testes

Os testes cobrem:

1. **Funcionalidade do WhatsApp**
   - Validação de números de telefone
   - Geração de URLs corretas
   - Adição de botões clicáveis

2. **Acessibilidade das Cores**
   - Contraste WCAG AA
   - Validação automática
   - Geração de paletas

3. **Integridade do PDF**
   - Estrutura válida do arquivo
   - Inclusão de todos os elementos
   - Tamanho mínimo adequado

4. **Validação de Dados**
   - Campos obrigatórios
   - Formatos válidos
   - Configurações do WhatsApp

5. **Tratamento de Erros**
   - Captura de exceções
   - Mensagens descritivas
   - Recuperação de erros

### Exemplo de Teste

```typescript
describe('WhatsApp Functionality', () => {
  it('should generate correct WhatsApp URL', () => {
    const phoneNumber = '+5511999999999';
    const message = 'Test message';
    const expectedUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(message)}`;
    
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const generatedUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    
    expect(generatedUrl).toBe(expectedUrl);
  });
});
```

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. Erro de Dependências

**Problema:** `Cannot resolve module 'pdfkit'`

**Solução:**
```bash
npm install pdfkit @types/pdfkit --save
```

#### 2. Erro de Contraste de Cores

**Problema:** Cores não passam na validação de acessibilidade

**Solução:**
```typescript
import { ColorUtils } from '@/lib/pdf-generators/modern-pdf-generator';

// Verificar contraste antes de usar
if (!ColorUtils.isAccessible(foregroundColor, backgroundColor)) {
  // Usar cor alternativa ou ajustar
  foregroundColor = ColorUtils.ensureContrast(foregroundColor, backgroundColor);
}
```

#### 3. Número de WhatsApp Inválido

**Problema:** Validação falha para números internacionais

**Solução:**
```typescript
// Formato correto para números internacionais
const phoneNumber = '+5511999999999'; // Código do país + DDD + número

// Validação
const cleanPhone = phoneNumber.replace(/\D/g, '');
if (cleanPhone.length < 10 || cleanPhone.length > 15) {
  throw new Error('Número de telefone inválido');
}
```

#### 4. PDF Muito Grande

**Problema:** Arquivo PDF com tamanho excessivo

**Solução:**
```typescript
const options: GenerationOptions = {
  quality: 'standard', // Em vez de 'high'
  // Ou usar compressão
};
```

#### 5. Erro de Memória

**Problema:** `JavaScript heap out of memory`

**Solução:**
```bash
# Aumentar limite de memória do Node.js
node --max-old-space-size=4096 your-script.js
```

### Logs de Debug

Para ativar logs detalhados:

```typescript
// Adicionar no início do arquivo
if (process.env.NODE_ENV === 'development') {
  console.log('PDF Generator Debug Mode');
}
```

### Performance

Para melhorar a performance:

1. **Use qualidade padrão** para previews
2. **Limite o número de elementos** por página
3. **Otimize imagens** antes de incluir
4. **Use cache** para documentos similares

## 📄 Licença

Este módulo está licenciado sob a MIT License.

## 🤝 Contribuição

Para contribuir com melhorias:

1. Fork o repositório
2. Crie uma branch para sua feature
3. Adicione testes para novas funcionalidades
4. Execute os testes existentes
5. Submeta um Pull Request

## 📞 Suporte

Para suporte técnico:

- Abra uma issue no repositório
- Consulte a documentação da API
- Verifique os testes unitários para exemplos

---

**Versão:** 2.0.0  
**Última atualização:** Janeiro 2024  
**Compatibilidade:** Node.js 16+, React 18+