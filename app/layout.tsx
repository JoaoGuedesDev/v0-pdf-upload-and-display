import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

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
  // Evita carregar o script de Web Analytics localmente.
  // Em Vercel, a env `VERCEL` é definida como "1".
  // Também pode ser habilitado manualmente via `NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS=true`.
  const enableAnalytics =
    process.env.VERCEL === '1' ||
    process.env.NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS === 'true'

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`font-sans antialiased bg-background text-foreground`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          {enableAnalytics && <Analytics />}
        </ThemeProvider>
      </body>
    </html>
  )
}
