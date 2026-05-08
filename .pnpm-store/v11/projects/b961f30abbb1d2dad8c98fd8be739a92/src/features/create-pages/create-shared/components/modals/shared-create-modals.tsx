import type { UseQueryResult } from "@tanstack/react-query";
import { lazy, Suspense } from "react";

import { CreateModalSkeleton } from "@/components/skeleton/create-modal-skeleton";
import type {
  ProductLookupItem,
  ProductWarehouseStockItem,
} from "@/features/create-pages/create-shared/api/create-shared.types";
import { ProductPopupModal } from "@/features/create-pages/create-shared/components/modals/product-popup-modal";
import { ProductWarehouseStockModal } from "@/features/create-pages/create-shared/components/modals/product-warehouse-stock-modal";
import type {
  LookupOption,
  PopupMode,
} from "@/features/create-pages/create-shared/utils/create-order.types";

const LookupPopupModal = lazy(() =>
  import("@/features/create-pages/create-shared/components/modals/lookup-popup-modal").then(
    (module) => ({
      default: module.LookupPopupModal,
    }),
  ),
);

interface SharedCreateModalsProps {
  state: {
    modalOpen: boolean;
    modalMode: PopupMode;
    modalSearch: string;
    setModalSearch: (value: string) => void;
    setModalOpen: (value: boolean) => void;
    popupResults: LookupOption[];
    handleLookupModalSearchSync: (mode: PopupMode, value: string) => void;

    // Lookups Queries/Logic
    vendorsQuery: {
      isFetching: boolean;
      isError: boolean;
      error: unknown;
      refetch: () => void;
    };
    warehousesQuery: {
      isFetching: boolean;
      isError: boolean;
      error: unknown;
      refetch: () => void;
    };
    salesEmployeesQuery: {
      isFetching: boolean;
      isError: boolean;
      error: unknown;
      refetch: () => void;
    };
    selectVendor: (item: LookupOption) => void;
    selectWarehouse: (item: LookupOption) => void;
    selectSalesEmployee: (item: LookupOption) => void;

    // Products
    productPopupOpen: boolean;
    setProductPopupOpen: (value: boolean) => void;
    productSearch: string;
    setProductSearch: (value: string) => void;
    products: ProductLookupItem[];
    productsQuery: {
      isLoading: boolean;
      isFetching: boolean;
      isError: boolean;
      error: unknown;
      refetch: () => void;
    };
    loadMoreProducts: () => void;
    applyProductToRow: (product: ProductLookupItem) => void;
    applyProductsToRows: (products: ProductLookupItem[]) => void;
    effectiveWarehouseCode: string;
    /** The product code of the currently active row, used to seed modal selection. */
    activeRowProductCode?: string | null;
    /** The row ID being edited — used as key for persisted selection state. */
    activeProductRowId?: string | null;

    // Stocks
    stockPreviewProduct: { code: string; name: string } | null;
    setStockPreviewProduct: (product: { code: string; name: string } | null) => void;
    productWarehouseStocksQuery: UseQueryResult<ProductWarehouseStockItem[], Error>;
  };
  entityLabels?: {
    vendorPopupTitle?: string;
    vendorErrorMsg?: string;
    salesEmployeeLabel?: string;
    salesEmployeeErrorMsg?: string;
  };
}

/**
 * SharedCreateModals: Unified orchestrator for select dialogs (Vendors, Items, Stocks).
 */
export function SharedCreateModals({ state, entityLabels }: SharedCreateModalsProps) {
  const { vendorPopupTitle = "Loading vendor popup", vendorErrorMsg = "Unable to load vendors" } =
    entityLabels || {};

  return (
    <>
      {state.modalOpen ? (
        <Suspense
          fallback={<CreateModalSkeleton title={vendorPopupTitle} panelClassName="max-w-xl" />}
        >
          <LookupPopupModal
            open={state.modalOpen}
            mode={state.modalMode}
            search={state.modalSearch}
            results={state.popupResults as LookupOption[]}
            loading={
              state.modalMode === "warehouse"
                ? state.warehousesQuery.isFetching
                : state.modalMode === "sales-employee"
                  ? state.salesEmployeesQuery.isFetching
                  : state.vendorsQuery.isFetching
            }
            error={
              state.modalMode === "warehouse"
                ? state.warehousesQuery.isError
                  ? state.warehousesQuery.error instanceof Error
                    ? state.warehousesQuery.error.message
                    : "Unable to load warehouses"
                  : null
                : state.modalMode === "sales-employee"
                  ? state.salesEmployeesQuery.isError
                    ? state.salesEmployeesQuery.error instanceof Error
                      ? state.salesEmployeesQuery.error.message
                      : entityLabels?.salesEmployeeErrorMsg || "Unable to load sales employees"
                    : null
                  : state.vendorsQuery.isError
                    ? state.vendorsQuery.error instanceof Error
                      ? state.vendorsQuery.error.message
                      : vendorErrorMsg
                    : null
            }
            onRetry={() => {
              if (state.modalMode === "warehouse") {
                void state.warehousesQuery.refetch();
                return;
              }
              if (state.modalMode === "sales-employee") {
                void state.salesEmployeesQuery.refetch();
                return;
              }
              void state.vendorsQuery.refetch();
            }}
            onSearchChange={state.setModalSearch}
            onSearchSync={state.handleLookupModalSearchSync}
            onClose={() => state.setModalOpen(false)}
            onSelect={(item) => {
              if (state.modalMode === "warehouse") {
                state.selectWarehouse(item);
                return;
              }
              if (state.modalMode === "sales-employee") {
                state.selectSalesEmployee(item);
                return;
              }
              state.selectVendor(item);
            }}
          />
        </Suspense>
      ) : null}

      {state.productPopupOpen ? (
        <ProductPopupModal
          open={state.productPopupOpen}
          warehouseCode={state.effectiveWarehouseCode}
          search={state.productSearch}
          results={state.products}
          loading={state.productsQuery.isLoading}
          backgroundLoading={state.productsQuery.isFetching && !state.productsQuery.isLoading}
          error={
            state.productsQuery.isError
              ? state.productsQuery.error instanceof Error
                ? state.productsQuery.error.message
                : "Unable to load products"
              : null
          }
          onRetry={() => {
            void state.productsQuery.refetch();
          }}
          onSearchChange={state.setProductSearch}
          onReachEnd={state.loadMoreProducts}
          onClose={() => state.setProductPopupOpen(false)}
          onSelect={state.applyProductToRow}
          onSelectMultiple={state.applyProductsToRows}
          selectedProductCode={state.activeRowProductCode}
          selectedProductRowId={state.activeProductRowId}
        />
      ) : null}

      {state.stockPreviewProduct ? (
        <ProductWarehouseStockModal
          open={Boolean(state.stockPreviewProduct)}
          product={state.stockPreviewProduct}
          currentWarehouseCode={state.effectiveWarehouseCode}
          stocks={state.productWarehouseStocksQuery.data ?? []}
          loading={state.productWarehouseStocksQuery.isLoading}
          error={
            state.productWarehouseStocksQuery.isError
              ? state.productWarehouseStocksQuery.error instanceof Error
                ? state.productWarehouseStocksQuery.error.message
                : "Unable to load warehouse stocks"
              : null
          }
          onRetry={() => {
            void state.productWarehouseStocksQuery.refetch();
          }}
          onClose={() => state.setStockPreviewProduct(null)}
        />
      ) : null}
    </>
  );
}
