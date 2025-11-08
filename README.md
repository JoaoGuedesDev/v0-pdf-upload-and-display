# PDF upload and display

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/juniorguedesjoao-9594s-projects/v0-pdf-upload-and-display)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/A3Zr0zO4UHU)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Modular Architecture

- Pages/modules: `upload`, `generator`, `insights`, cada um com página dedicada em `app/<module>/page.tsx`.
- Interfaces: contratos em `lib/interfaces.ts` para tipar eventos e propriedades das páginas.
- Monitoring: utilitário em `lib/monitoring.ts` para logs e métricas por módulo.
- Scope control: `modules.json` define imports permitidos por módulo; `scripts/scope-check.js` valida.
- Tests: unitários por página em `tests/pages/*.test.tsx` com Jest + RTL.

### Regras de Escopo

- Execute `npm run scope:check` para garantir que páginas respeitam seus limites de importação.
- Violação de escopo falha o comando com detalhes do arquivo e import indevido.

### Pipeline CI local

- `npm run ci` roda lint, testes e `scope:check` em sequência.
- Integre no seu provedor CI/CD (Vercel/GitHub Actions) usando este comando.

### Monitoramento

- Use `monitor.log({ module, action, payload, at })` e `monitor.metric(module, name, value)`.
- Métricas acumuladas podem ser obtidas via `monitor.getMetrics()`.

### Páginas

- Upload: upload e validação básica, não processa PDF; delega à API.
- Generator: geração de PDF e demonstração (`/demo-pdf`).
- Insights: consome `app/api/insights` e exibe resultado.

## Deployment

Your project is live at:

**[https://vercel.com/juniorguedesjoao-9594s-projects/v0-pdf-upload-and-display](https://vercel.com/juniorguedesjoao-9594s-projects/v0-pdf-upload-and-display)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/projects/A3Zr0zO4UHU](https://v0.app/chat/projects/A3Zr0zO4UHU)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## Environment Variables

To enable unique share links and PDF generation on Vercel:

- Configure one of the following KV backends:
  - Vercel KV: set `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or `KV_URL`).
  - Upstash Redis: set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or `UPSTASH_REDIS_URL` and `UPSTASH_REDIS_TOKEN`).
- Optionally set `NEXT_PUBLIC_BASE_URL` to your production domain (e.g., `https://integra-pgdas.vercel.app`) to ensure the PDF API targets the correct origin.

If no KV backend is configured, links will only work locally using the filesystem fallback.

### PDF em produção (fallback via navegador remoto)

Em ambientes serverless recentes (Node 20/22 em Amazon Linux 2023), o Chromium pode falhar ao iniciar por falta de bibliotecas do sistema (`libnss3.so`). As rotas de PDF deste projeto possuem fallback para conexão remota com um navegador via WebSocket quando a env `BROWSER_WS_ENDPOINT` está definida e o ambiente não é `development`.

Como configurar sem Docker:
- Crie uma conta no Browserless Cloud ou use um host próprio que ofereça WebSocket de Chrome.
- Obtenha um token de acesso.
- No projeto Vercel, adicione `BROWSER_WS_ENDPOINT` com o valor `wss://chrome.browserless.io?token=SEU_TOKEN`.
- Execute um redeploy com “Clear build cache”.
- Valide as rotas `GET /api/pdf/id?id=...` e `GET /api/pdf/[id]`.

Alternativa sem serviço remoto:
- Ajuste a versão do Node para `18` em “Build & Development Settings” no Vercel e redeploy com cache limpo.
- Garanta que as rotas têm `export const runtime = 'nodejs'` e que as flags serverless do `@sparticuz/chromium` estão ativas.

Observação: o fallback remoto elimina dependências de bibliotecas do host. Se preferir manter o lançamento local no Vercel, a falta de `libnss3.so` pode persistir dependendo da imagem-base da função.
