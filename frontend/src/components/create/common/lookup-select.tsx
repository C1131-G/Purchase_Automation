import { Input } from '@/components/ui/input'

export type LookupOption = {
  code: string
  name: string
}

type LookupSelectProps = {
  label: string
  value: string
  options: LookupOption[]
  placeholder?: string
  onChange: (code: string) => void
  disabled?: boolean
}

export function LookupSelect({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled,
}: LookupSelectProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600">{label}</span>
      <select
        className="h-12 rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        <option value="">{placeholder ?? 'Select'}</option>
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.code} - {option.name}
          </option>
        ))}
      </select>
    </label>
  )
}

type TextFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}

export function TextField({ label, value, onChange, placeholder, type = 'text' }: TextFieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600">{label}</span>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
