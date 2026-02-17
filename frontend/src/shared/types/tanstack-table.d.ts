import { type RowData } from '@tanstack/react-table'

declare module '@tanstack/react-table' {
  interface SelectOption {
    label: string
    value: string
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    tableId?: string
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    filterType?: TableFilterType
    filterOptions?: SelectOption[] | boolean
  }
}
