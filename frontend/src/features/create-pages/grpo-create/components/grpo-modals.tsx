import { ProductPopupModal } from '@/features/create-pages/create-shared/components/modals/product-popup-modal'
import { ProductWarehouseStockModal } from '@/features/create-pages/create-shared/components/modals/product-warehouse-stock-modal'
import { type useGRPOCreate } from '@/features/create-pages/grpo-create/hooks/use-grpo-create'

interface GRPOModalsProps {
  state: ReturnType<typeof useGRPOCreate>
}

export function GRPOModals({ state }: GRPOModalsProps) {
  return (
    <>
      {state.productPopupOpen ? (
        <ProductPopupModal
          open={state.productPopupOpen}
          warehouseCode={state.effectiveWarehouseCode}
          search={state.productSearch}
          results={state.products}
          loading={state.productsQuery.isLoading}
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
          onReachEnd={state.loadMoreProducts}
          onClose={() => state.setProductPopupOpen(false)}
          onSelect={state.applyProductToRow}
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
                : 'Unable to load warehouse stocks'
              : null
          }
          onRetry={() => {
            void state.productWarehouseStocksQuery.refetch()
          }}
          onClose={() => state.setStockPreviewProduct(null)}
        />
      ) : null}
    </>
  )
}
