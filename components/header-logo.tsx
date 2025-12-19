"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface HeaderLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string
}

export function HeaderLogo({ className, ...props }: HeaderLogoProps) {
  return (
    <img
      src="/shared/integra-logo.png"
      alt="Integra Soluções Empresariais"
      className={cn("w-auto object-contain dark:invert dark:brightness-200", className)}
      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/integra-logo.svg' }}
      {...props}
    />
  )
}
