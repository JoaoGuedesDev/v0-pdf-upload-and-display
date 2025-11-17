/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Define explicit root para o Turbopack e evitar seleção incorreta
  turbopack: {
    root: process.cwd(),
  },
  // Garante que os binários do @sparticuz/chromium sejam incluídos
  // no bundle das rotas de geração de PDF (serverless / Node.js).
  outputFileTracingIncludes: {
    'app/api/pdf/id/route': [
      'node_modules/@sparticuz/chromium/**',
    ],
    'app/api/pdf/[id]/route': [
      'node_modules/@sparticuz/chromium/**',
    ],
  },
}

export default nextConfig
