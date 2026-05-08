import type { useAPCreditMemoCreate } from "@/features/create-pages/ap-credit-memo-create/hooks/use-ap-credit-memo-create";
import type {
  LookupItem,
  ProductLookupItem,
} from "@/features/create-pages/create-shared/api/create-shared.types";
import { LookupPopupModal } from "@/features/create-pages/create-shared/components/modals/lookup-popup-modal";
import { ProductPopupModal } from "@/features/create-pages/create-shared/components/modals/product-popup-modal";

interface APCreditMemoModalsProps {
  state: ReturnType<typeof useAPCreditMemoCreate>;
}

export function APCreditMemoModals({ state }: APCreditMemoModalsProps) {
  return (
    <>
      <LookupPopupModal
        open={state.modalOpen}
        onClose={() => state.setModalOpen(false)}
        mode={state.modalMode}
        search={state.modalSearch}
        onSearchChange={state.setModalSearch}
        results={state.popupResults}
        loading={state.isLookupLoading}
        error={state.lookupError}
        onSelect={(item: LookupItem) => {
          if (state.modalMode === "vendor-name" || state.modalMode === "vendor-code") {
            state.selectVendor(item);
          } else if (state.modalMode === "warehouse") {
            state.selectWarehouse(item);
          } else {
            state.selectSalesEmployee(item);
          }
          state.setModalOpen(false);
        }}
        onSearchSync={state.handleLookupModalSearchSync}
      />

      <ProductPopupModal
        open={state.productPopupOpen}
        onClose={() => state.setProductPopupOpen(false)}
        warehouseCode={state.warehouseCode}
        search={state.productSearch}
        results={state.products as ProductLookupItem[]}
        loading={state.isProductsLoading}
        error={state.productsError}
        onSearchChange={(val) => state.setProductSearch(val)}
        onSelect={state.applyProductToRow}
        onSelectMultiple={state.applyProductsToRows}
        onReachEnd={state.loadMoreProducts}
        selectedProductCode={state.activeRowProductCode}
        selectedProductRowId={state.activeProductRowId}
      />
    </>
  );
}
