import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
      size: {
        // Redução exata de 2px na altura total
        // default agora força altura fixa para garantir consistência
        default: "h-[6px] px-[2px] text-[5px] leading-none",
        // compact também reduzido em 2px a partir do padrão anterior (20px -> 18px)
        compact: "h-[6px] px-[2px] text-[5px] leading-none",
      },
    },
    defaultVariants: {
      variant: "default",
      // Adota dimensões compactas como padrão em toda a interface
      size: "compact",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }