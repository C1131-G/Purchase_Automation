import { useEffect, useId, useState } from 'react'

import type { DebouncedInputProps } from '@/components/types/input.types'

/**
 * DebouncedInput: State-optimized entry field for high-frequency updates (e.g., search).
 * PERFORMANCE: Throttles `onChange` emissions to reduce expensive parent re-renders.
 */
export function DebouncedInput({
  value: initialValue,
  onChange,
  debounce = 350,
  id,
  name,
  ...props
}: DebouncedInputProps) {
  const [value, setValue] = useState(initialValue)
  const autoId = useId()
  const resolvedId = id ?? autoId
  const resolvedName = name ?? resolvedId

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(timeout)
  }, [value, onChange, debounce])

  return (
    <input
      {...props}
      id={resolvedId}
      name={resolvedName}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  )
}
