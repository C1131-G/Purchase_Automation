import { type Column, type Table } from '@tanstack/react-table'

/**
 * Extracts a human-readable title from a column definition.
 * Handles both string headers and function headers with props.
 */
export function getColumnTitle<TData>(column: Column<TData, unknown>, table: Table<TData>): string {
  const header = column.columnDef.header
  if (typeof header === 'function') {
    try {
      const headerElement = header({ column, header: column.columnDef.header, table } as any)
      if (headerElement && typeof headerElement === 'object' && 'props' in (headerElement as any)) {
        return (headerElement as any).props.title || column.id
      }
    } catch {
      return column.id
    }
  } else if (typeof header === 'string') {
    return header
  }
  return column.id
}
