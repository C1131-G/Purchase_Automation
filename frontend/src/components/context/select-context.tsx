import React, { createContext, useContext } from 'react'

export type SelectContextType = {
  open: boolean
  setOpen: (open: boolean) => void
  value: string | undefined
  setValue: (value: string) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
  disabled: boolean
  labelMap: Record<string, string | React.ReactNode>
  registerLabel: (value: string, label: string | React.ReactNode) => void
}

/**
 * SelectContext: Engine for custom industrial-grade dropdowns.
 * ARCHITECTURE: Manages selection state, item registration, and portal visibility.
 */
export const SelectContext = createContext<SelectContextType | null>(null)

export function useSelect() {
  const context = useContext(SelectContext)
  if (!context) throw new Error('Select components must be used within SelectRoot')
  return context
}
