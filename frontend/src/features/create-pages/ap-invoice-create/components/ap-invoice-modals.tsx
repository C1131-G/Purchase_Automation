import type { useAPInvoiceCreate } from "@/features/create-pages/ap-invoice-create/hooks/use-ap-invoice-create";
import type {
  LookupItem,
  ProductLookupItem,
} from "@/features/create-pages/create-shared/api/create-shared.types";
import { CreateModalSkeleton } from "@/components/skeleton/create-modal-skeleton";
import { lazy, Suspense } from "react";

const LookupPopupModal = lazy(() =>
  import("@/features/create-pages/create-shared/components/modals/lookup-popup-modal").then(
    (module) => ({
      default: module.LookupPopupModal,
    }),
  ),
);

const ProductPopupModal = lazy(() =>
  import("@/features/create-pages/create-shared/components/modals/product-popup-modal").then(
    (module) => ({
      default: module.ProductPopupModal,
    }),
  ),
);

interface APInvoiceModalsProps {
  state: ReturnType<typeof useAPInvoiceCreate>;
}

export function APInvoiceModals({ state }: APInvoiceModalsProps) {
  return (
    <>
      {state.modalOpen ? (
        <Suspense
          fallback={<CreateModalSkeleton title="Loading lookup" panelClassName="max-w-xl" />}
        >
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
        </Suspense>
      ) : null}

      {state.productPopupOpen ? (
        <Suspense
          fallback={
            <CreateModalSkeleton
              title="Loading products"
              panelClassName="max-w-3xl"
              columns={2}
              rows={8}
            />
          }
        >
          <ProductPopupModal
            open={state.productPopupOpen}
            onClose={() => state.setProductPopupOpen(false)}
            warehouseCode={state.searchWarehouseCode || state.warehouseCode}
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
        </Suspense>
      ) : null}
    </>
  );
}
