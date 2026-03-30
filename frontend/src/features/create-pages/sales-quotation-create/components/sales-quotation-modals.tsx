import { SharedCreateModals } from '@/features/create-pages/create-shared/components/modals/shared-create-modals'
import { type useSalesQuotationCreate } from '@/features/create-pages/sales-quotation-create/hooks/use-sales-quotation-create'

interface SalesQuotationModalsProps {
  state: ReturnType<typeof useSalesQuotationCreate>
}

/**
 * SalesQuotationModals: specialized selection dialogs (Customers, Items) for SQ flow.
 * Uses SharedCreateModals for consistent UI patterns.
 */
export function SalesQuotationModals({ state }: SalesQuotationModalsProps) {
  return (
    <SharedCreateModals
      state={state}
      entityLabels={{
        vendorPopupTitle: 'Search Customers',
        vendorErrorMsg: 'Unable to load customers',
      }}
    />
  )
}
