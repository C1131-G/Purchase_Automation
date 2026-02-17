import { useEffect, useId, useState } from 'react'

type DebouncedInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  value: string | number
  onChange: (value: string | number) => void
  debounce?: number
}

export function DebouncedInput({
  value: initialValue,
  onChange,
  debounce = 500,
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
      className="h-8 w-full rounded-lg border border-zinc-200/80 bg-white/50 px-2.5 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-sans shadow-sm"
    />
  )
}
