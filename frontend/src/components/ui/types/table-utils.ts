import { type Column, type HeaderContext, type Table } from '@tanstack/react-table'

// getColumnTitle: Extracts human-readable header text from TanStack Table column definitions.
export function getColumnTitle<TData>(column: Column<TData, unknown>, table: Table<TData>): string {
  const header = column.columnDef.header
  if (typeof header === 'function') {
    try {
      const headerRenderer = header as (ctx: Partial<HeaderContext<TData, unknown>>) => unknown
      const headerElement = headerRenderer({
        column,
        table,
      })
      if (
        headerElement &&
        typeof headerElement === 'object' &&
        'props' in headerElement &&
        headerElement.props
      ) {
        const props = headerElement.props as { title?: string }
        return props.title || column.id
      }
    } catch {
      return column.id
    }
  } else if (typeof header === 'string') {
    return header
  }
  return column.id
}
