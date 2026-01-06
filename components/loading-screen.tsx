"use client"

import { HeaderLogo } from "@/components/header-logo"
import { cn } from "@/lib/utils"

interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message = "Processando documentos..." }: LoadingScreenProps) {
  // Create an array of 12 items to represent the 12 months (or just multiple logos)
  const items = Array.from({ length: 12 }, (_, i) => i)

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-4">
      {/* Background Grid of Logos */}
      <div className="w-full max-w-4xl grid grid-cols-4 md:grid-cols-6 gap-8 opacity-10 absolute inset-0 m-auto pointer-events-none overflow-hidden h-full content-center">
        {items.map((i) => (
          <div
            key={i}
            className={cn(
                "flex items-center justify-center transition-all duration-1000",
                i % 2 === 0 ? "animate-pulse" : "animate-bounce"
            )}
            style={{ 
                animationDuration: `${2 + (i % 3)}s`,
                animationDelay: `${i * 0.1}s` 
            }}
          >
             <HeaderLogo className="w-16 h-auto grayscale opacity-50" />
          </div>
        ))}
      </div>

      {/* Central Card */}
      <div className="relative z-10 animate-in zoom-in-95 duration-500 fade-in-0">
        <div className="bg-card p-8 rounded-2xl shadow-2xl border border-border flex flex-col items-center gap-6 max-w-md w-full text-center relative overflow-hidden">
            {/* Shimmer effect */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#007AFF] to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>

            <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-[#007AFF] opacity-20"></div>
                <div className="relative bg-background rounded-full p-4 shadow-sm border border-border">
                    <HeaderLogo className="h-12 w-auto" />
                </div>
            </div>
            
            <div className="space-y-2">
                <h3 className="text-xl font-bold text-foreground">
                    Integra Soluções Empresariais
                </h3>
                <p className="text-lg font-medium text-[#007AFF] dark:text-[#00C2FF] animate-pulse">
                    {message}
                </p>
                <p className="text-sm text-muted-foreground">
                    Validando e consolidando informações fiscais...
                </p>
            </div>

            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden relative">
                <div className="absolute top-0 left-0 h-full bg-[#007AFF] w-1/3 animate-loading-bar rounded-full"></div>
            </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes loading-bar {
            0% { left: -35%; }
            100% { left: 100%; }
        }
        .animate-loading-bar {
            animation: loading-bar 1.5s infinite linear;
        }
      `}</style>
    </div>
  )
}
