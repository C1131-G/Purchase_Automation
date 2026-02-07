import { Loader2 } from 'lucide-react'
import React from 'react'

import { cn } from '@/utils/cn'

import type { ButtonProps } from './types/button.types'

/**
 * Button: Industrial-grade action component.
 * 
 * DESIGN: SAP B1 / Vercel-style sapphire aesthetic with XL radius (2rem/12px).
 * ARCHITECTURE: Compound component pattern with variants/sizes mapping.
 * UI/UX: Integrated loading state with spin micro-animation and active scale feedback.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', isLoading, loadingText, children, ...props },
    ref,
  ) => {
    const variants = {
      // BRAND: High-contrast primary action
      primary: 'bg-zinc-950 text-white hover:bg-black shadow-sm focus:ring-zinc-950/20',
      // NEUTRAL: Subtle secondary actions
      secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 focus:ring-zinc-200/50',
      // SURGICAL: Interactive borders for clean layouts
      outline:
        'border border-zinc-200 bg-transparent text-zinc-900 hover:bg-zinc-50 focus:ring-zinc-100',
      // MINIMAL: Background-less utility actions
      ghost:
        'bg-transparent text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 focus:ring-zinc-100',
      // DESTRUCTIVE: Critical warnings/deletions
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600/20',
    }

    const sizes = {
      sm: 'h-9 px-3 text-xs',
      md: 'h-12 px-6 text-sm',
      lg: 'h-14 px-8 text-base',
      icon: 'size-12 rounded-xl flex items-center justify-center p-0',
    }

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-bold uppercase tracking-[0.15em] transition-all duration-300',
          'focus:outline-none focus:ring-4 ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer active:scale-[0.98]',
          variants[variant],
          sizes[size],
          className,
        )}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingText || children}
          </>
        ) : (
          children
        )}
      </button>
    )
  },
)

Button.displayName = 'Button'
