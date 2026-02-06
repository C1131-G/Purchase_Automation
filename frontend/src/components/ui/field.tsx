import React, { useId } from 'react'

import { cn } from '@/utils/cn'

import { FieldContext, type FieldContextValue, useField } from '@/components/ui/context/field-context'

/**
 * Standardized Field Components.
 * - Sapphire & White Theme.
 * - Industrial Bold Labels.
 */
export function FieldRoot({
  children,
  error,
  className,
}: {
  children: React.ReactNode
  error?: string
  className?: string
}) {
  const id = useId()
  const errorId = `${id}-error`
  const descriptionId = `${id}-description`

  const value: FieldContextValue = {
    id,
    errorId,
    descriptionId,
  }

  if (error !== undefined) {
    value.error = error
  }

  return (
    <FieldContext.Provider value={value}>
      <div className={cn('space-y-1.5 w-full', className)}>{children}</div>
    </FieldContext.Provider>
  )
}

export function FieldLabel({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  const { id } = useField()

  return (
    <label
      htmlFor={id}
      className={cn(
        'text-[11px] text-zinc-950 font-bold uppercase tracking-widest mb-1.5 block px-1 select-none',
        className,
      )}
      {...props}
    >
      {children}
    </label>
  )
}

type FieldControlRenderProps = {
  id: string
  'aria-describedby': string
  'aria-invalid': boolean
}

export function FieldControl({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const { id, errorId, descriptionId, error } = useField()

  // If children is a function, call it with the field props
  if (typeof children === 'function') {
    return (children as (props: FieldControlRenderProps) => React.ReactNode)({
      id,
      'aria-describedby': error ? errorId : descriptionId,
      'aria-invalid': !!error,
    })
  }

  // Otherwise, clone the child and inject the props
  return React.cloneElement(children as React.ReactElement<{ className?: string }>, {
    id,
    'aria-describedby': error ? errorId : descriptionId,
    'aria-invalid': !!error,
    className: cn(
      (children as React.ReactElement<{ className?: string }>).props.className,
      className,
    ),
    ...props,
  })
}

export function FieldDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const { descriptionId } = useField()
  return (
    <p
      id={descriptionId}
      className={cn('text-[10px] text-zinc-400 font-medium px-1', className)}
      {...props}
    />
  )
}

export function FieldError({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  const { errorId, error } = useField()

  if (!error) return null

  return (
    <p
      id={errorId}
      className={cn(
        'text-red-600 text-[10px] font-bold uppercase mt-1.5 px-1 animate-in fade-in slide-in-from-top-1',
        className,
      )}
      {...props}
    >
      {error}
    </p>
  )
}
export const Field = {
  Root: FieldRoot,
  Label: FieldLabel,
  Control: FieldControl,
  Description: FieldDescription,
  Error: FieldError,
}
