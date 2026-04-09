import { type useAPInvoiceCreate } from '@/features/create-pages/ap-invoice-create/hooks/use-ap-invoice-create'
import {
  type LookupItem,
  type ProductLookupItem,
} from '@/features/create-pages/create-shared/api/create-shared.types'
import { LookupPopupModal } from '@/features/create-pages/create-shared/components/modals/lookup-popup-modal'
import { ProductPopupModal } from '@/features/create-pages/create-shared/components/modals/product-popup-modal'

interface APInvoiceModalsProps {
  state: ReturnType<typeof useAPInvoiceCreate>
}

export function APInvoiceModals({ state }: APInvoiceModalsProps) {
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
          if (state.modalMode === 'vendor-name' || state.modalMode === 'vendor-code') {
            state.selectVendor(item)
          } else if (state.modalMode === 'warehouse') {
            state.selectWarehouse(item)
          } else {
            state.selectSalesEmployee(item)
          }
          state.setModalOpen(false)
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
        existingProductCodes={state.existingProductCodes}
        onBlockDuplicate={state.onBlockDuplicate}
      />
    </>
  )
}
