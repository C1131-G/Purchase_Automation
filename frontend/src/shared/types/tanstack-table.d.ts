import { type RowData } from '@tanstack/react-table'

import {
  type SelectOption,
  type TableFilterType,
} from '@/features/table-pages/table-shared/utils/table-filter-values'

/**
 * TanStack Table Module Augmentation:
 * Extends internal Table and Column metadata with ERP-specific properties (IDs, Filter UI types).
 */
declare module '@tanstack/react-table' {
  interface TableMeta<TData extends RowData, _TInternal = unknown> {
    // Type-only anchor to keep declaration generics intentional and lint-safe.
    __tableTypeAnchor?: [TData?, _TInternal?]
    tableId?: string
  }

  interface ColumnMeta<
    TData extends RowData,
    TValue,
    _TInternal1 = unknown,
    _TInternal2 = unknown,
  > {
    // Type-only anchor to keep declaration generics intentional and lint-safe.
    __typeAnchor?: [TData?, TValue?, _TInternal1?, _TInternal2?]
    filterType?: TableFilterType
    filterOptions?: SelectOption[] | string[] | boolean
  }
}
