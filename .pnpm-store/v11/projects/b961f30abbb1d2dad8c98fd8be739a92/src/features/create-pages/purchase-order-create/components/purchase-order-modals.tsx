import { SharedCreateModals } from "@/features/create-pages/create-shared/components/modals/shared-create-modals";
import type { usePurchaseOrderCreate } from "@/features/create-pages/purchase-order-create/hooks/use-purchase-order-create";

interface PurchaseOrderModalsProps {
  state: ReturnType<typeof usePurchaseOrderCreate>;
}

/**
 * PurchaseOrderModals: specialized selection dialogs (Vendors, Items) for PO flow.
 * Uses SharedCreateModals for consistent UI patterns.
 */
export function PurchaseOrderModals({ state }: PurchaseOrderModalsProps) {
  return (
    <SharedCreateModals
      state={state}
      entityLabels={{
        vendorErrorMsg: "Unable to load vendors",
        vendorPopupTitle: "Loading vendor popup",
      }}
    />
  );
}
