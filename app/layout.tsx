import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Toaster as AppToaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/theme-provider'
import { ModeToggle } from '@/components/mode-toggle'
import { HeaderLogo } from '@/components/header-logo'

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
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 print:hidden">
            <div className="flex items-center gap-4">
              <HeaderLogo className="h-8 sm:h-10" />
              <div className="h-6 w-px bg-border hidden sm:block" />
              <span className="font-semibold text-lg hidden sm:inline-block">Integra Dashboard</span>
            </div>
            <ModeToggle />
          </header>
          {children}
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
