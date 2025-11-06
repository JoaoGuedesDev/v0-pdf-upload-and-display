/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Garante que módulos nativos/externos sejam incluídos no bundle do servidor
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Mantemos a config mínima; sem externalização necessária com pdf-parse@1.1.1
}

export default nextConfig
