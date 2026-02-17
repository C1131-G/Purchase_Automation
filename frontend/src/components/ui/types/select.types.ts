import React from 'react'

export type SelectRootProps = {
  children: React.ReactNode
  value?: string | undefined
  defaultValue?: string | undefined
  onValueChange?: (value: string) => void
  disabled?: boolean
}
