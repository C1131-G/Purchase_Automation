import { SharedCreateModals } from "@/features/create-pages/create-shared/components/modals/shared-create-modals";
import type { usePurchaseQuotationCreate } from "@/features/create-pages/purchase-quotation-create/hooks/use-purchase-quotation-create";

interface PurchaseQuotationModalsProps {
  state: ReturnType<typeof usePurchaseQuotationCreate>;
}

/**
 * PurchaseQuotationModals: specialized selection dialogs (vendors, Items) for PQ flow.
 * Uses SharedCreateModals for consistent UI patterns.
 */
export function PurchaseQuotationModals({ state }: PurchaseQuotationModalsProps) {
  return (
    <SharedCreateModals
      state={state}
      entityLabels={{
        vendorErrorMsg: "Unable to load vendors",
        vendorPopupTitle: "Search vendors",
      }}
    />
  );
}
