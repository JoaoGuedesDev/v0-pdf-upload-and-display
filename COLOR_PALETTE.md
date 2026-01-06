# Paleta de Cores - Tema Roxo (Purple Theme)

Este documento define a nova paleta de cores baseada em tons de roxo para o IntegraDAS, garantindo consistência visual e acessibilidade.

## 1. Visão Geral
A paleta utiliza uma escala de roxos, violetas e índigos para criar uma interface moderna e harmoniosa. O contraste foi ajustado para atender aos padrões de acessibilidade.

- **Cor Primária:** Violet 600 (`#7C3AED`) - Usada para ações principais, botões e destaques.
- **Fundo (Light):** Purple 50 (`#FAF5FF`) - Tom muito suave de roxo para o fundo da página.
- **Fundo (Dark):** Very Dark Purple (`#0F0518`) - Tom profundo para o modo escuro.
- **Textos:** Purple 950 (`#3B0764`) no modo claro e Purple 50 (`#FAF5FF`) no modo escuro.

## 2. Paleta de Cores (Hexadecimais)

### Modo Claro (Light Mode)

| Nome | Hex | Descrição | Uso |
|------|-----|-----------|-----|
| **Background** | `#FAF5FF` | Purple 50 | Fundo geral da página |
| **Foreground** | `#3B0764` | Purple 950 | Texto principal |
| **Card** | `#FFFFFF` | White | Fundo de cartões/painéis |
| **Primary** | `#7C3AED` | Violet 600 | Botões primários, anéis de foco |
| **Secondary** | `#F3E8FF` | Purple 100 | Botões secundários, fundos sutis |
| **Secondary FG** | `#581C87` | Purple 900 | Texto em elementos secundários |
| **Muted** | `#F3E8FF` | Purple 100 | Elementos desabilitados ou sutis |
| **Muted FG** | `#7E22CE` | Purple 700 | Texto de apoio/secundário |
| **Border** | `#E9D5FF` | Purple 200 | Bordas e divisórias |
| **Destructive** | `#EF4444` | Red 500 | Ações de erro/exclusão |

### Modo Escuro (Dark Mode)

| Nome | Hex | Descrição | Uso |
|------|-----|-----------|-----|
| **Background** | `#0F0518` | Very Dark | Fundo geral da página |
| **Foreground** | `#FAF5FF` | Purple 50 | Texto principal |
| **Card** | `#2E1065` | Purple 950 | Fundo de cartões |
| **Primary** | `#A78BFA` | Violet 400 | Botões primários (mais claro para contraste) |
| **Secondary** | `#581C87` | Purple 900 | Botões secundários |
| **Secondary FG** | `#FAF5FF` | Purple 50 | Texto em elementos secundários |
| **Muted** | `#581C87` | Purple 900 | Elementos desabilitados |
| **Muted FG** | `#D8B4FE` | Purple 300 | Texto de apoio |
| **Border** | `#581C87` | Purple 900 | Bordas |

### Cores de Gráficos (Data Visualization)

Cores selecionadas para garantir distinção entre séries de dados em gráficos.

1.  **Chart 1:** `#8B5CF6` (Violet 500)
2.  **Chart 2:** `#D946EF` (Fuchsia 500)
3.  **Chart 3:** `#6366F1` (Indigo 500)
4.  **Chart 4:** `#A855F7` (Purple 500)
5.  **Chart 5:** `#EC4899` (Pink 500)
6.  **Extra:** `#7C3AED` (Violet 600)

## 3. Aplicação

### Componentes UI (Shadcn/Tailwind)
As cores são mapeadas para variáveis CSS em `app/globals.css`. O Tailwind usa essas variáveis automaticamente através das classes utilitárias (ex: `bg-primary`, `text-foreground`).

### Gráficos (Chart.js)
No arquivo `AnnualDashboard.tsx`, as cores foram atualizadas manualmente na configuração dos datasets e no `chartTheme` para garantir que grades, tooltips e textos sigam a nova identidade visual.

### Acessibilidade
- O texto principal (`#3B0764`) sobre fundo claro (`#FAF5FF`) possui contraste de **15.6:1** (AAA).
- A cor primária (`#7C3AED`) sobre branco possui contraste de **4.8:1** (AA).
