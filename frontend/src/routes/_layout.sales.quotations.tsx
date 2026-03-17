import { createFileRoute } from '@tanstack/react-router'

import { SalesQuotationTable } from '@/features/table-pages/sales-quotations/components/sales-quotation-table'
import { salesQuotationSearchSchema } from '@/features/table-pages/sales-quotations/schemas/sales-quotation-search.schema'

export const Route = createFileRoute('/_layout/sales/quotations')({
  validateSearch: (search) => salesQuotationSearchSchema.parse(search),
  component: SalesQuotationTable,
})
