import { createContext, useContext } from 'react'

export type FieldContextValue = {
  id: string
  errorId: string
  descriptionId: string
  error?: string
}

export const FieldContext = createContext<FieldContextValue | undefined>(undefined)

export function useField() {
  const context = useContext(FieldContext)
  if (!context) {
    throw new Error('useField must be used within a FieldRoot')
  }
  return context
}
