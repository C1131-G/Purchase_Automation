import React from 'react'

import { cn } from '@/shared/utils/cn'

// Table Primitives: Industrial data grid foundations with SAP B1 aesthetics and industrial typography.

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full">
      <table
        ref={ref}
        className={cn(
          'min-w-full w-full table-fixed caption-bottom text-sm border-collapse',
          className,
        )}
        {...props}
      />
    </div>
  ),
)
Table.displayName = 'Table'

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('[&_tr]:border-b bg-zinc-50/50', className)} {...props} />
))
TableHeader.displayName = 'TableHeader'

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
))
TableBody.displayName = 'TableBody'

export const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn('border-t bg-zinc-50/50 font-medium [&>tr]:last:border-b-0', className)}
    {...props}
  />
))
TableFooter.displayName = 'TableFooter'

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn('group border-b border-zinc-100 transition-colors', className)}
    {...props}
  />
))
TableRow.displayName = 'TableRow'

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    // CONTRACT: Upper-case tracking-wider style matching FieldLabel for visual cohesion
    className={cn(
      'h-12 px-6 text-left align-middle font-bold text-zinc-500 font-sans text-[10px] uppercase tracking-wider border-b border-zinc-100 group transition-colors whitespace-nowrap overflow-hidden',
      className,
    )}
    {...props}
  />
))
TableHead.displayName = 'TableHead'

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'px-8 py-4 align-middle text-left font-normal font-sans text-[13px] border-b border-zinc-50/50 last:border-b-0 transition-all duration-200 cursor-pointer whitespace-nowrap',
      className,
    )}
    {...props}
  />
))
TableCell.displayName = 'TableCell'
