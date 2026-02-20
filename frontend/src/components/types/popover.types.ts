import React from 'react'

export type PopoverRootProps = {
  children: React.ReactNode
  defaultOpen?: boolean
}

export type PopoverTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
}

export type PopoverContentProps = {
  children: React.ReactNode
  className?: string
  side?: 'top' | 'bottom'
  align?: 'start' | 'center' | 'end'
  unstyled?: boolean
  id?: string
}
