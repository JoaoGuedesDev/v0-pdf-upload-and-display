# Pivot de Design e Layout

## Gráficos
- Donut unificado: `components/charts/DonutTributos.tsx` com setas ligadas às cores e suporte a PDF.
- Barras em card dedicado: `components/cards/ReceitaMensalCard.tsx` com rótulos nas barras e tooltip melhorado.
- Paleta central: `lib/design.ts` (`chartColors`, `palette`).

## Layout e Dimensões
- Card de Distribuição: `components/cards/DistribuicaoDASCard.tsx` com config `pieHeight`, `pieOuterRadius`, `gridGap`.
- Resumo executivo: `components/cards/ResumoExecutivoCard.tsx`.
- Integração no relatório: `components/pgdasd-processor-ia.tsx`.

## Melhorias Comerciais
- CTA "Baixar Relatório" no card de distribuição.
- Resumo executivo com métricas principais.

## Requisitos Técnicos
- Compatibilidade preservada: estrutura de dados original mantida.
- PDF: rótulos estáveis via `LabelList`, dimensões ajustáveis.

## Entregáveis
- Fonte atualizada nas pastas `components/cards`, `components/charts`, `lib/design.ts`.
- PDF exemplo: `public/shared/relatorio-pivot-exemplo.pdf` (gerado pelo script `scripts/make-pdf.js`).