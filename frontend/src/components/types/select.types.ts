import React from 'react'

/**
 * SelectRootProps: Configuration for custom industrial-grade dropdowns.
 * STATE: Supports both controlled (`value`) and uncontrolled (`defaultValue`) patterns.
 */
export type SelectRootProps = {
  children: React.ReactNode
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  id?: string
  name?: string
  autoComplete?: string
}

export type SelectValueProps = {
  placeholder?: string
  className?: string
}

export type SelectIconProps = {
  children: React.ReactNode
  className?: string
}

export type SelectPositionerProps = {
  children: React.ReactNode
  className?: string
  side?: 'top' | 'bottom'
}

export type SelectPopupProps = {
  children: React.ReactNode
  className?: string
}

export type SelectListProps = {
  children: React.ReactNode
  className?: string
}

export type SelectItemProps = {
  value: string
  label?: string | React.ReactNode
  children: React.ReactNode
  className?: string
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>
}
