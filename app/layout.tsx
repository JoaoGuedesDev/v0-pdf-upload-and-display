import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Toaster as AppToaster } from '@/components/ui/toaster'
import { SpeedInsights } from '@vercel/speed-insights/next'

const _geist = Geist({ subsets: ["latin"], preload: true });
const _geistMono = Geist_Mono({ subsets: ["latin"], preload: true });

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Carrega o script de Web Analytics somente quando habilitado explicitamente.
  // Isso evita possíveis exceções de cliente em ambientes de produção (Vercel)
  // caso o pacote tenha incompatibilidades com a versão do React/Next.

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${_geist.className} ${_geistMono.className} font-sans antialiased bg-background text-foreground`}>
        {children}
        <AppToaster />
        <SpeedInsights />
      </body>
    </html>
  )
}
