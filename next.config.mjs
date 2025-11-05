/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Mantemos a config mínima; sem externalização necessária com pdf-parse@1.1.1
}

export default nextConfig
