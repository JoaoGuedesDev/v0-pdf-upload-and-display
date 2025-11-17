# Melhorias no Posicionamento do Gráfico de Pizza - Valores Acima das Fatias

## Implementações Realizadas

### 1. **Posicionamento dos Valores Numéricos Acima das Fatias**

#### Componente `DonutTributosPrint.tsx` (PDF):
- ✅ **Cálculo de coordenadas polares**: Usa ângulo e raio para posicionar valores acima de cada fatia
- ✅ **Fórmula de posicionamento**:
  ```typescript
  const angle = Number(midAngle ?? 0)
  const rad = (angle * Math.PI) / 180
  const radius = Number(outerRadius ?? 0) + 25 // 25px acima da borda externa
  const labelX = cx + radius * Math.cos(rad)
  const labelY = cy + radius * Math.sin(rad)
  ```
- ✅ **Valores claramente visíveis**: 
  - Valor monetário em negrito (font-weight: 600) na cor #1e293b
  - Porcentagem logo abaixo em cinza (#64748b) com fonte menor
  - Tamanho otimizado: 10px para valores, 9px para porcentagens

#### Componente `DonutTributosScreen.tsx` (Tela):
- ✅ **Mesma lógica de posicionamento**: Consistência entre tela e PDF
- ✅ **Adaptação para dark mode**: Cores ajustadas para melhor contraste
  - Valores: #f1f5f9 (claro) no dark mode
  - Porcentagens: #94a3b8 (cinza claro) no dark mode
- ✅ **Linhas de conexão visuais**: Traços finos conectando fatias aos valores

### 2. **Layout Preservado - Gráfico à Direita da Distribuição**

#### Configuração de Colunas no PDF:
```
[Receita Mensal] [GAP 4mm] [Gráfico Pizza]
    (esquerda)        (direita)
```

#### Especificações do Posicionamento:
- ✅ **Largura de coluna**: `(pageWidth - margin * 2 - gap) / 2`
- ✅ **Gap entre colunas**: 4mm de espaçamento
- ✅ **Posição X do gráfico**: `margin + colW + gap` (lado direito)
- ✅ **Alinhamento vertical**: Mesma altura (yTop = margin) para ambos os gráficos

### 3. **Otimização de Tamanho e Proporções**

#### Dimensões Ajustadas:
- ✅ **Tamanho do gráfico aumentado**: 380×260 → 400×280 pixels
- ✅ **Centro reposicionado**: cx=190 → cx=200, cy=130 → cy=140
- ✅ **Raio externo otimizado**: 110 → 115 pixels
- ✅ **Espaço extra para labels**: +25px acima da borda externa

#### Escalonamento no PDF:
```typescript
const scale = Math.min(colW / d.w, (pageHeight - margin * 2) / d.h)
const w = d.w * scale
const h = d.h * scale
```

### 4. **Garantia de Preservação na Exportação PDF**

#### Configurações de Captura:
- ✅ **300 DPI mantido**: `computePixelRatioForDPI(pieRoot, targetColWidthMm, 300)`
- ✅ **Compressão FAST**: `pdf.addImage(pieImgUrl, 'PNG', rightX, yTop, w, h, undefined, 'FAST')`
- ✅ **Aguarda renderização**: `waitForChartsReady` garante que labels estejam visíveis
- ✅ **Fundo preservado**: `backgroundColor: darkMode ? "#0f172a" : "#ffffff"`

### 5. **Elementos Visuais Aprimorados**

#### Linhas de Conexão:
```typescript
<line
  x1={x} y1={y}
  x2={labelX} y2={labelY}
  stroke="#cbd5e1"
  strokeWidth={1}
  strokeDasharray="2,2"
/>
```

#### Hierarquia Visual:
- **Valores monetários**: Fonte 10px, peso 600, cor principal
- **Porcentagens**: Fonte 9px, peso normal, cor cinza
- **Âncora de texto**: Ajustada baseada na posição horizontal

## Códigos Modificados

### Posicionamento com Coordenadas Polares:
```typescript
// Calcula posição acima da fatia (fora do gráfico)
const cx = Number(pcx ?? 0)
const cy = Number(pcy ?? 0)
const angle = Number(midAngle ?? 0)
const rad = (angle * Math.PI) / 180
const radius = Number(outerRadius ?? 0) + 25 // 25px acima da borda externa

// Calcula coordenadas do ponto acima da fatia
const labelX = cx + radius * Math.cos(rad)
const labelY = cy + radius * Math.sin(rad)

// Define âncora baseada na posição horizontal
const anchor = labelX < cx ? "end" : "start"
const dx = anchor === "start" ? 4 : -4
```

### Layout no PDF (Lado Direito):
```typescript
const gap = 4 // 4mm entre colunas
const availableW = pageWidth - margin * 2
const colW = (availableW - gap) / 2

const leftX = margin // Gráfico de receita (esquerda)
const rightX = margin + colW + gap // Gráfico de pizza (direita)
const yTop = margin // Mesma altura para ambos
```

## Benefícios Entregues

1. **Posicionamento Preciso**: Valores aparecem exatamente acima de cada fatia
2. **Visual Limpo**: Layout organizado sem sobreposições ou cortes
3. **Consistência Total**: Mesma aparência em tela e PDF
4. **Legibilidade Aprimorada**: Fontes otimizadas e contraste adequado
5. **Preservação Completa**: Todos os elementos visuais mantidos na exportação
6. **Layout Profissional**: Gráfico posicionado corretamente à direita da distribuição

## Teste

Para verificar as melhorias:
1. Acesse o dashboard com dados de PGDAS
2. Observe o gráfico de pizza - valores devem aparecer acima de cada fatia
3. Gere o PDF - confirme que:
   - Gráfico está à direita da distribuição
   - Valores monetários aparecem acima das fatias
   - Cores e formatação estão preservadas
   - Layout está equilibrado e profissional