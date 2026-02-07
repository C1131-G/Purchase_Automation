import React from 'react'

export interface SelectRootProps {
  children: React.ReactNode
  value?: string | undefined
  defaultValue?: string | undefined
  onValueChange?: (value: string) => void
  disabled?: boolean
}
