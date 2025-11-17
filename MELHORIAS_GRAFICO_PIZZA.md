# Melhorias no Gráfico de Pizza - Valores Monetários e Layout

## Implementações Realizadas

### 1. **Valores Monetários ao Lado de Cada Fatia**

#### Componente `DonutTributosPrint.tsx` (PDF):
- ✅ **Exibição de valores monetários**: Cada fatia agora mostra o valor formatado em BRL (R$ 0.000,00)
- ✅ **Porcentagens incluídas**: Adicionado percentual de participação de cada imposto no total
- ✅ **Layout organizado**: 
  - Nome do imposto na linha superior
  - Valor monetário e porcentagem na linha inferior
  - Fonte maior (11px com weight 500) para melhor legibilidade
- ✅ **Setas coloridas mantidas**: Preservadas as setas coloridas que indicam cada fatia

#### Componente `DonutTributosScreen.tsx` (Tela):
- ✅ **Tooltips aprimorados**: Agora mostram valor monetário + porcentagem
- ✅ **Formatação consistente**: Mesmo padrão de exibição para ambos os componentes
- ✅ **Largura ajustada**: Aumentada para acomodar o texto completo

### 2. **Layout no PDF - Posicionamento à Direita**

#### Configuração de Layout:
- ✅ **Posição já correta**: O gráfico de pizza já está posicionado à direita da distribuição de dados
- ✅ **Proporções otimizadas**: 
  - Aumentado tamanho do gráfico de 360×240 para 380×260 pixels
  - Raio externo ajustado de 90 para 110 para melhor aproveitamento do espaço
  - Centro reposicionado (cx: 180 → 190) para centralização perfeita

#### Estrutura de Colunas no PDF:
```
[Receita Mensal] [GAP] [Gráfico Pizza]
    (esquerda)    4mm    (direita)
```

### 3. **Centro do Gráfico Aprimorado**

#### Ambos os Componentes:
- ✅ **Título melhorado**: "Total" → "Total Tributos" para maior clareza
- ✅ **Fonte aumentada**: 12px → 14px para o valor principal
- ✅ **Informação adicional**: Quantidade de impostos exibida abaixo do total
- ✅ **Cores otimizadas**: Melhor contraste para modo claro/escuro

### 4. **Preservação de Estilo e Cores**

#### Paleta de Cores:
- ✅ **Cores originais mantidas**: Mesma sequência de cores `CHART_COLORS`
- ✅ **Consistência de tema**: Adaptação automática para dark/light mode
- ✅ **Setas coloridas**: Preservadas para manter identidade visual

#### Tipografia:
- ✅ **Hierarquia visual**: Tamanhos de fonte organizados (14px, 11px, 10px, 9px)
- ✅ **Peso de fonte**: Usado `font-weight: 500` para nomes dos impostos
- ✅ **Cores de apoio**: Cinza (#64748b) para valores secundários

## Códigos Modificados

### `DonutTributosPrint.tsx` - Labels com Valores:
```typescript
const percentage = total > 0 ? ((val / total) * 100).toFixed(1) : "0.0"

return (
  <text style={{ fontSize: 11, fontWeight: 500 }}>
    <tspan fill={arrowColor}>→</tspan>
    <tspan dx={4}>{lbl}</tspan>
    <tspan x={x} dy={12} dx={dx} style={{ fontSize: 10, fill: "#64748b" }}>
      {formatCurrency(val)} ({percentage}%)
    </tspan>
  </text>
)
```

### Centro do Gráfico Aprimorado:
```typescript
<div className="text-center">
  <div className="text-slate-700" style={{ fontSize: 10 }}>Total Tributos</div>
  <div className="text-slate-900 font-bold" style={{ fontSize: 14 }}>{formatCurrency(total)}</div>
  <div className="text-slate-500 mt-1" style={{ fontSize: 9 }}>
    {items.length} {items.length === 1 ? 'imposto' : 'impostos'}
  </div>
</div>
```

## Benefícios Entregues

1. **Clareza Visual**: Valores monetários tornam a comparação entre impostos imediata
2. **Contexto de Porcentagem**: Facilita entendimento da participação de cada tributo
3. **Layout Profissional**: Organização hierárquica melhora legibilidade
4. **Consistência**: Mesmo padrão visual em tela e PDF
5. **Espaço Otimizado**: Aproveitamento máximo do espaço disponível
6. **Acessibilidade**: Fontes maiores e contraste adequado para fácil leitura

## Teste

Para verificar as melhorias:
1. Acesse o dashboard com dados de PGDAS
2. Observe o gráfico de pizza na tela - passe o mouse para ver tooltips com valores
3. Gere o PDF - o gráfico estará à direita com valores monetários ao lado de cada fatia
4. Verifique a legibilidade em diferentes resoluções