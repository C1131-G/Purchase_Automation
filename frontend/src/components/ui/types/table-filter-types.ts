export type FilterType = 'string' | 'number' | 'number-comparison' | 'select' | 'boolean' | 'date'

export interface DateRangeFilter {
  from?: string | undefined
  to?: string | undefined
}

export interface ColumnFilterConfig {
  type: FilterType
  label: string
  options?: string[]
}

export const COLUMN_FILTER_CONFIG: Record<string, ColumnFilterConfig> = {
  DocEntry: {
    type: 'string',
    label: 'Doc Entry',
  },
  DocNum: {
    type: 'string',
    label: 'Doc Number',
  },
  DocDate: {
    type: 'string',
    label: 'Doc Date',
  },
  CardCode: {
    type: 'string',
    label: 'Vendor Code',
  },
  CardName: {
    type: 'string',
    label: 'Vendor Name',
  },
  DocTotal: {
    type: 'number-comparison',
    label: 'Doc Total',
  },
  DocStatus: {
    type: 'select',
    label: 'Doc Status',
    options: ['Open', 'Closed'],
  },
  Canceled: {
    type: 'boolean',
    label: 'Cancelled',
    options: ['Yes', 'No'],
  },
}

export const getColumnFilterConfig = (columnId: string): ColumnFilterConfig | undefined => {
  return COLUMN_FILTER_CONFIG[columnId]
}
