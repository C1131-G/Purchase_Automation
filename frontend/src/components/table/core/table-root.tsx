import React from 'react'

import { cn } from '@/utils/cn'

/**
 * Table Components: Industrial data grid primitives.
 * 
 * DESIGN: SAP B1 aesthetic with zinc-100 borders and sapphire-50 hover highlights.
 * TYPOGRAPHY: Specialized sizes (10px uppercase for headers, 13px for data).
 * LAYOUT: Border-collapse with precise padding for ERP readability.
 */

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full">
      <table
        ref={ref}
        className={cn('min-w-full w-full caption-bottom text-sm border-collapse', className)}
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
    className={cn('border-b border-zinc-100 transition-colors hover:bg-blue-50/30', className)}
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
      'h-12 px-6 text-left align-middle font-bold text-zinc-500 font-sans text-[10px] uppercase tracking-wider border-b border-zinc-100 transition-all hover:text-blue-600 group cursor-pointer',
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
      'px-6 py-4 align-middle font-medium text-zinc-900 font-sans text-[13px] border-b border-zinc-50/50 last:border-b-0',
      className,
    )}
    {...props}
  />
))
TableCell.displayName = 'TableCell'
