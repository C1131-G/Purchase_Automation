import '@tanstack/react-table'

declare module '@tanstack/react-table' {
    interface ColumnMeta<TData, TValue> {
        filterType?: 'text' | 'select' | 'date' | 'number' | 'number-comparison' | 'boolean'
        filterOptions?: { label: string; value: string }[]
    }
}
