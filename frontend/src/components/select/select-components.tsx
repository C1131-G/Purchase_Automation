import React, { useEffect, useRef, useState } from 'react'

import { SelectContext, type SelectContextType } from '@/components/context/select-context'
import { useSelect } from '@/components/context/select-context'
import type {
  SelectIconProps,
  SelectItemProps,
  SelectListProps,
  SelectPopupProps,
  SelectPositionerProps,
  SelectRootProps,
  SelectValueProps,
} from '@/components/types/select.types'
import { cn } from '@/shared/utils/cn'

/**
 * SelectRoot: Context-driven engine for custom dropdowns.
 * STATE: Handles both controlled and uncontrolled value patterns.
 * UX: Tracks labels and items to display readable selection values in the trigger.
 */
export function SelectRoot({
  children,
  value: controlledValue,
  defaultValue,
  onValueChange,
  disabled,
  id,
  name,
}: SelectRootProps) {
  const [open, setOpen] = useState(false)
  const [uncontrolledValue, setUncontrolledValue] = useState(() => defaultValue)
  const [labelMap, setLabelMap] = useState<Record<string, string | React.ReactNode>>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const autoId = React.useId()
  const resolvedId = id ?? autoId
  const value = controlledValue !== undefined ? controlledValue : uncontrolledValue

  const setValue = (val: string) => {
    if (controlledValue === undefined) {
      setUncontrolledValue(val)
    }
    onValueChange?.(val)
    setOpen(false)
  }

  const registerLabel = (val: string, label: string | React.ReactNode) => {
    setLabelMap((prev) => {
      if (prev[val] === label) return prev
      return { ...prev, [val]: label }
    })
  }

  const handleSetOpen = (newOpen: boolean) => {
    if (disabled) return
    setOpen(newOpen)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (open && triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        const popup = document.querySelector('[data-select-popup]')
        if (popup && popup.contains(event.target as Node)) return
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const contextValue: SelectContextType = {
    open,
    setOpen: handleSetOpen,
    value,
    setValue,
    triggerRef,
    disabled: !!disabled,
    labelMap,
    registerLabel,
  }

  return (
    <SelectContext.Provider value={contextValue}>
      <div className="relative w-full overflow-visible">
        {name ? (
          <input
            type="hidden"
            id={resolvedId}
            name={name}
            value={value ?? ''}
            readOnly
            disabled={disabled}
          />
        ) : null}
        {children}
      </div>
    </SelectContext.Provider>
  )
}

export function SelectTrigger({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen, triggerRef, disabled } = useSelect()

  return (
    <button
      ref={triggerRef}
      type="button"
      disabled={disabled}
      onClick={() => setOpen(!open)}
      className={cn(
        'flex h-12 w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2 text-sm text-zinc-900 select-none transition-all font-outfit ring-offset-1 cursor-pointer active:scale-[0.98]',
        'hover:bg-white hover:border-zinc-300',
        'focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent focus:bg-white',
        open && 'ring-2 ring-blue-600 border-transparent bg-white shadow-sm',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function SelectValue({ placeholder, className }: SelectValueProps) {
  const { value, labelMap } = useSelect()
  const displayLabel = value ? labelMap[value] || value : null

  return (
    <span
      className={cn(
        'block truncate text-left w-full font-medium text-zinc-300 font-outfit',
        value && 'text-zinc-900',
        className,
      )}
    >
      {displayLabel || value || placeholder}
    </span>
  )
}

export function SelectIcon({ children, className }: SelectIconProps) {
  const { open } = useSelect()
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center text-zinc-500 transition-transform duration-300',
        open && 'rotate-90',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function SelectPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function SelectPositioner({ children, className, side = 'bottom' }: SelectPositionerProps) {
  const { open } = useSelect()
  if (!open) return null

  return (
    <div
      className={cn(
        'absolute z-999 w-full animate-in fade-in duration-300 pointer-events-auto',
        side === 'bottom' ? 'mt-2 top-full' : 'mb-2 bottom-full slide-in-from-bottom-2',
        side === 'bottom' && 'slide-in-from-top-2',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function SelectPopup({ children, className }: SelectPopupProps) {
  return (
    <div
      data-select-popup
      className={cn(
        'overflow-hidden rounded-xl border border-zinc-100 bg-white text-zinc-900 shadow-xl ring-1 ring-black/5',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function SelectList({ children, className }: SelectListProps) {
  return (
    <div className={cn('max-h-87.5 overflow-y-auto p-1.5 space-y-0.5', className)}>{children}</div>
  )
}

export function SelectItem({ value, label, children, className, onMouseEnter }: SelectItemProps) {
  const { setValue, value: selectedValue, registerLabel } = useSelect()
  const isSelected = selectedValue === value

  useEffect(() => {
    if (label) {
      registerLabel(value, label)
    } else if (typeof children === 'string') {
      registerLabel(value, children)
    }
  }, [value, children, label, registerLabel])

  return (
    <div
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onMouseEnter={onMouseEnter}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          setValue(value)
        }
      }}
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setValue(value)
      }}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm transition-all duration-200',
        'hover:bg-blue-50/50 hover:text-blue-600',
        isSelected ? 'bg-blue-50/80 text-blue-700 font-bold' : 'text-zinc-700',
        className,
      )}
    >
      <div className="flex-1 overflow-hidden">{children}</div>
      {isSelected && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-r-full animate-in slide-in-from-left-1 duration-300" />
      )}
    </div>
  )
}
