import React from 'react'

import { cn } from '@/utils/cn'

import type { InputProps } from './types/input.types'

/**
 * Input: High-precision data entry field.
 * 
 * DESIGN: Subdued zinc-50 background with sapphire-600 focus ring.
 * ARCHITECTURE: Forwards refs for TanStack Form / react-hook-form integration.
 * ACCESSIBILITY: Automatic ID generation handles label/input pairing if `id` is omitted.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, id, name, ...props }, ref) => {
    const autoId = React.useId()
    const resolvedId = id ?? autoId
    const resolvedName = name ?? resolvedId

    return (
      <input
        ref={ref}
        id={resolvedId}
        name={resolvedName}
        className={cn(
          'flex h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm text-zinc-900 transition-all font-outfit',
          'placeholder:text-zinc-300',
          'focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent focus:bg-white',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'ring-offset-1',
          className,
        )}
        {...props}
      />
    )
  },
)

Input.displayName = 'Input'
