import { lazy, Suspense } from 'react'

import { CreateModalSkeleton } from '@/components/skeleton/create-modal-skeleton'
import { type LookupOption } from '@/features/create-pages/create-shared/utils/create-order.types'
import { type usePurchaseOrderCreate } from '@/features/create-pages/purchase-order-create/hooks/use-purchase-order-create'

// PurchaseOrderModals: specialized selection dialogs (Vendors, Items) for PO flow.
const LookupPopupModal = lazy(() =>
  import('@/features/create-pages/create-shared/components/modals/lookup-popup-modal').then(
    (module) => ({
      default: module.LookupPopupModal,
    }),
  ),
)
const ProductPopupModal = lazy(() =>
  import('@/features/create-pages/create-shared/components/modals/product-popup-modal').then(
    (module) => ({
      default: module.ProductPopupModal,
    }),
  ),
)
const ProductWarehouseStockModal = lazy(() =>
  import('@/features/create-pages/create-shared/components/modals/product-warehouse-stock-modal').then(
    (module) => ({
      default: module.ProductWarehouseStockModal,
    }),
  ),
)

interface PurchaseOrderModalsProps {
  state: ReturnType<typeof usePurchaseOrderCreate>
}

export function PurchaseOrderModals({ state }: PurchaseOrderModalsProps) {
  return (
    <>
      {state.modalOpen ? (
        <Suspense
          fallback={<CreateModalSkeleton title="Loading vendor popup" panelClassName="max-w-xl" />}
        >
          <LookupPopupModal
            open={state.modalOpen}
            mode={state.modalMode}
            search={state.modalSearch}
            results={state.popupResults as LookupOption[]}
            loading={
              state.modalMode === 'warehouse'
                ? state.warehousesQuery.isFetching
                : state.modalMode === 'sales-employee'
                  ? state.salesEmployeesQuery.isFetching
                  : state.vendorsQuery.isFetching
            }
            error={
              state.modalMode === 'warehouse'
                ? state.warehousesQuery.isError
                  ? state.warehousesQuery.error instanceof Error
                    ? state.warehousesQuery.error.message
                    : 'Unable to load warehouses'
                  : null
                : state.modalMode === 'sales-employee'
                  ? state.salesEmployeesQuery.isError
                    ? state.salesEmployeesQuery.error instanceof Error
                      ? state.salesEmployeesQuery.error.message
                      : 'Unable to load sales employees'
                    : null
                  : state.vendorsQuery.isError
                    ? state.vendorsQuery.error instanceof Error
                      ? state.vendorsQuery.error.message
                      : 'Unable to load vendors'
                    : null
            }
            onRetry={() => {
              if (state.modalMode === 'warehouse') {
                void state.warehousesQuery.refetch()
                return
              }
              if (state.modalMode === 'sales-employee') {
                void state.salesEmployeesQuery.refetch()
                return
              }
              void state.vendorsQuery.refetch()
            }}
            onSearchChange={state.setModalSearch}
            onSearchSync={state.handleLookupModalSearchSync}
            onClose={() => state.setModalOpen(false)}
            onSelect={(item) => {
              if (state.modalMode === 'warehouse') {
                state.selectWarehouse(item)
                return
              }
              if (state.modalMode === 'sales-employee') {
                state.selectSalesEmployee(item)
                return
              }
              state.selectVendor(item)
            }}
          />
        </Suspense>
      ) : null}

      {state.productPopupOpen ? (
        <Suspense
          fallback={
            <CreateModalSkeleton
              title="Loading product popup"
              subtitle="Warehouse"
              columns={4}
              panelClassName="max-w-4xl"
            />
          }
        >
          <ProductPopupModal
            open={state.productPopupOpen}
            warehouseCode={state.effectiveWarehouseCode}
            search={state.productSearch}
            results={state.products}
            loading={state.productsQuery.isFetching}
            error={
              state.productsQuery.isError
                ? state.productsQuery.error instanceof Error
                  ? state.productsQuery.error.message
                  : 'Unable to load products'
                : null
            }
            onRetry={() => {
              void state.productsQuery.refetch()
            }}
            onSearchChange={state.setProductSearch}
            onClose={() => state.setProductPopupOpen(false)}
            onSelect={state.applyProductToRow}
          />
        </Suspense>
      ) : null}

      {state.stockPreviewProduct ? (
        <Suspense
          fallback={
            <CreateModalSkeleton
              title="Loading stock popup"
              subtitle="Warehouse stock"
              columns={3}
              panelClassName="max-w-2xl"
            />
          }
        >
          <ProductWarehouseStockModal
            open={Boolean(state.stockPreviewProduct)}
            product={state.stockPreviewProduct}
            currentWarehouseCode={state.effectiveWarehouseCode}
            stocks={state.productWarehouseStocksQuery.data ?? []}
            loading={
              state.productWarehouseStocksQuery.isLoading ||
              state.productWarehouseStocksQuery.isFetching
            }
            error={
              state.productWarehouseStocksQuery.isError
                ? state.productWarehouseStocksQuery.error instanceof Error
                  ? state.productWarehouseStocksQuery.error.message
                  : 'Unable to load warehouse stocks'
                : null
            }
            onRetry={() => {
              void state.productWarehouseStocksQuery.refetch()
            }}
            onClose={() => state.setStockPreviewProduct(null)}
          />
        </Suspense>
      ) : null}
    </>
  )
}
