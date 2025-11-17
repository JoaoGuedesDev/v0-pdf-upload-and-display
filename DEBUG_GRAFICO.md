# Debug do Gráfico de Pizza

## Problema Reportado
Usário informou que "não mudou nada" no gráfico de pizza após as alterações.

## Possíveis Causas

### 1. **Cache do Navegador**
- O navegador pode estar usando uma versão cacheada do componente
- **Solução**: Limpar cache ou usar aba anônima

### 2. **Imagem Cacheada no PDF**
- O `pieImageUrl` pode estar com valor antigo cacheado
- **Solução**: Implementada - agora sempre recaptura o gráfico ao gerar PDF

### 3. **Renderização dos Labels**
- Os labels podem não estar sendo renderizados corretamente
- **Debug adicionado**: Console logs para verificar se a função `renderLabel` está sendo chamada

### 4. **Posicionamento dos Valores**
- Os valores podem estar fora da área visível do gráfico
- **Ajustes feitos**:
  - Aumentado raio de posicionamento: 25px → 70px acima da borda externa
  - Aumentado tamanho do gráfico: 360×240 → 450×320 pixels
  - Adicionado fundo branco para melhor contraste

## Como Verificar Se Está Funcionando

### 1. **No Console do Navegador**
Abra o console (F12) e procure por mensagens como:
```
[DonutTributosPrint] Renderizando label: IRPJ, valor: 1250.5, x: 180, y: 120
[DonutTributosPrint] Posição calculada: labelX: 280, labelY: 180, anchor: start
[PDF] Recapturando gráfico de pizza com novos labels...
[PDF] Gráfico de pizza recapturado com sucesso
```

### 2. **Testar com Dados Específicos**
Use este arquivo HTML criado para teste: `test-grafico-pizza.html`
- Abra no navegador
- Verifique se os valores aparecem acima das fatias
- Os valores devem estar em caixas brancas com borda cinza

### 3. **Verificar o PDF Gerado**
- Gere um PDF com dados de teste
- Vá para a segunda página (página dos gráficos)
- O gráfico de pizza deve estar à direita
- Cada fatia deve ter um valor monetário acima dela

## Código Atualizado

### Posicionamento dos Valores:
```typescript
// Calcula posição acima da fatia (fora do gráfico)
const angle = Number(midAngle ?? 0)
const rad = (angle * Math.PI) / 180
const radius = Number(outerRadius ?? 0) + 70 // 70px acima da borda externa

const labelX = cx + radius * Math.cos(rad)
const labelY = cy + radius * Math.sin(rad)
```

### Renderização com Fundo:
```typescript
{/* Fundo branco para melhor legibilidade */}
<rect
  x={anchor === "start" ? labelX - 5 : labelX - 80}
  y={yClamped - 16}
  width={85}
  height={24}
  fill="white"
  stroke="#e2e8f0"
  strokeWidth={1}
  rx={4}
/>
{/* Valor monetário acima da fatia */}
<text
  x={labelX}
  y={yClamped - 4}
  dy={0}
  dx={dx}
  textAnchor={anchor as any}
  fill="#1e293b"
  style={{ fontSize: 12, fontWeight: 700 }}
>
  {formatCurrency(val)}
</text>
```

## Próximos Passos

1. **Verificar Console**: Abra o console do navegador e veja se há mensagens de debug
2. **Testar HTML**: Abra o arquivo `test-grafico-pizza.html` para ver se funciona isoladamente
3. **Limpar Cache**: Limpar cache do navegador e tentar novamente
4. **Verificar Dados**: Confirmar que os dados de tributos estão sendo carregados corretamente

## Se Ainda Não Funcionar

Por favor, verifique:
1. Se há erros no console do navegador
2. Se os dados de tributos estão aparecendo no dashboard
3. Se o problema é específico no PDF ou também na visualização da tela
4. Se os valores aparecem em alguma posição diferente do esperado