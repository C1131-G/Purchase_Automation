import { SharedCreateModals } from "@/features/create-pages/create-shared/components/modals/shared-create-modals";
import type { useSalesOrderCreate } from "@/features/create-pages/sales-order-create/hooks/use-sales-order-create";

interface SalesOrderModalsProps {
  state: ReturnType<typeof useSalesOrderCreate>;
}

/**
 * SalesOrderModals: specialized selection dialogs (Customers, Items) for SO flow.
 * Uses SharedCreateModals for consistent UI patterns.
 */
export function SalesOrderModals({ state }: SalesOrderModalsProps) {
  return (
    <SharedCreateModals
      state={state}
      entityLabels={{
        vendorErrorMsg: "Unable to load customers",
        vendorPopupTitle: "Search Customers",
      }}
    />
  );
}
