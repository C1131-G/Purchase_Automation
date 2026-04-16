import { useQueryClient } from '@tanstack/react-query'
import { goeyToast } from 'goey-toast'
import { useRef } from 'react'

import { ArCreditMemoProductSection } from '@/features/create-pages/ar-credit-memo-create/components/ar-credit-memo-product-section'
import { useArCreditMemoCreate } from '@/features/create-pages/ar-credit-memo-create/hooks/use-ar-credit-memo-create'
import { AddressGrid } from '@/features/create-pages/create-shared/components/grids/address-grid'
import { DocumentDatesGrid } from '@/features/create-pages/create-shared/components/grids/document-dates-grid'
import { LogisticsGrid } from '@/features/create-pages/create-shared/components/grids/logistics-grid'
import { ReferenceGrid } from '@/features/create-pages/create-shared/components/grids/reference-grid'
import { VendorCustomerGrid } from '@/features/create-pages/create-shared/components/grids/vendor-customer-grid'
import { CreatePageWrapper } from '@/features/create-pages/create-shared/components/layout/create-page-wrapper'
import { SharedCreateModals } from '@/features/create-pages/create-shared/components/modals/shared-create-modals'
import {
  parseISODate,
  toDisplayDate,
  toISODate,
} from '@/features/create-pages/create-shared/utils/create-order.utils'
import { arCreditMemoQueries } from '@/features/table-pages/ar-credit-memo/api/ar-credit-memo.queries'

export interface ArCreditMemoCreateProps {
  mode?: 'create' | 'edit'
  docNum?: string
  sourceDocNum?: string | undefined
  sourceDocType?: string | undefined
}

/**
 * ArCreditMemoCreate: Main entry for the AR Credit Memo creation flow.
 * Layout matches the AR Invoice create page exactly:
 *  Row 1: Customer Info | Document Details (logistics) | Document Dates
 *  Row 2: Address | Reference
 *  Row 3: Product section (with checkboxes + return reason)
 */
export function ArCreditMemoCreate({
  mode = 'create',
  docNum,
  sourceDocNum,
  sourceDocType,
}: ArCreditMemoCreateProps) {
  const queryClient = useQueryClient()
  const state = useArCreditMemoCreate({ mode, docNum, sourceDocNum, sourceDocType })
  const docDateContainerRef = useRef<HTMLDivElement>(null)
  const deliveryDateContainerRef = useRef<HTMLDivElement>(null)

  const {
    header,
    setHeader,
    vendorsQuery,
    warehousesQuery,
    salesEmployeesQuery,
    nameInput,
    codeInput,
    nameFocused,
    setNameFocused,
    codeFocused,
    setCodeFocused,
    nameSuggestions,
    codeSuggestions,
    salesEmployeeInput,
    setSalesEmployeeFocused,
    salesEmployeeFocused,
    salesEmployeeSuggestions,
    handleVendorNameChange,
    handleVendorCodeChange,
    handleSalesEmployeeChange,
    selectVendor,
    openPopup,
    productsHook,
    totals,
    summaryCurrencyLabel,
    createError,
    createDisabledReason,
    createArCreditMemoMutation,
    missingMandatoryFields,
    requiredCompletionPercent,
    handleCreateOrder,
    missingSearchMandatoryFields,
    searchRequiredCompletionPercent,
    searchMandatoryFields,
    warehouses,
    warehousesLoading,
  } = state

  // Build the state shape SharedCreateModals expects
  const modalsState = {
    modalOpen: state.modalOpen,
    setModalOpen: state.setModalOpen,
    modalMode: state.modalMode,
    modalSearch: state.modalSearch,
    setModalSearch: state.setModalSearch,
    popupResults: state.popupResults,
    handleLookupModalSearchSync: state.handleLookupModalSearchSync,
    vendorsQuery,
    warehousesQuery,
    salesEmployeesQuery,
    selectVendor,
    selectWarehouse: state.selectWarehouse,
    selectSalesEmployee: state.selectSalesEmployee,
    productPopupOpen: state.productPopupOpen,
    setProductPopupOpen: state.setProductPopupOpen,
    productSearch: state.productSearch,
    setProductSearch: state.setProductSearch,
    products: productsHook.products,
    productsQuery: productsHook.productsQuery,
    loadMoreProducts: productsHook.loadMoreProducts,
    applyProductToRow: (product: Parameters<typeof productsHook.applyProductToRow>[0]) =>
      productsHook.applyProductToRow(product, {
        closeProductPopup: () => state.setProductPopupOpen(false),
      }),
    applyProductsToRows: (products: Parameters<typeof productsHook.applyProductsToRows>[0]) =>
      productsHook.applyProductsToRows(products, {
        closeProductPopup: () => state.setProductPopupOpen(false),
      }),
    effectiveWarehouseCode: header.warehouseCode,
    activeRowProductCode: null,
    activeProductRowId: productsHook.activeProductRowId,
    stockPreviewProduct: state.stockPreviewProduct,
    setStockPreviewProduct: state.setStockPreviewProduct,
    productWarehouseStocksQuery: productsHook.productWarehouseStocksQuery,
  }

  return (
    <div
      onClickCapture={() => goeyToast.dismiss()}
      onKeyDownCapture={() => goeyToast.dismiss()}
      className="contents"
    >
      <CreatePageWrapper
        rootLabel="Sales"
        breadcrumbParent={{
          label: 'AR Credit Memos Data Table',
          to: '/sales/ar-credit-memo',
          onMouseEnter: () =>
            void queryClient.prefetchQuery(arCreditMemoQueries.list({ page: 1, limit: 10 })),
        }}
        pageTitle={state.isEditMode ? `A/R Credit Memo - ${docNum}` : 'Create A/R Credit Memo'}
      >
        {/* Row 1: Customer Info | Document Details (Logistics) | Document Dates — matches AR Invoice */}
        <div className="grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
          <VendorCustomerGrid
            loading={vendorsQuery.isLoading}
            error={
              vendorsQuery.isError
                ? vendorsQuery.error instanceof Error
                  ? vendorsQuery.error.message
                  : 'Unable to load customers.'
                : null
            }
            sectionTitle="Customer Info"
            nameLabel="Customer Name *"
            codeLabel="Customer Code *"
            namePlaceholder="Select or Type Customer"
            codePlaceholder="Select or Type Code"
            nameInput={nameInput}
            codeInput={codeInput}
            nameFocused={nameFocused}
            codeFocused={codeFocused}
            nameSuggestions={nameSuggestions}
            codeSuggestions={codeSuggestions}
            onNameChange={handleVendorNameChange}
            onCodeChange={handleVendorCodeChange}
            onNameFocus={() => setNameFocused(true)}
            onCodeFocus={() => setCodeFocused(true)}
            onNameBlur={() => setTimeout(() => setNameFocused(false), 120)}
            onCodeBlur={() => setTimeout(() => setCodeFocused(false), 120)}
            onOpenNamePopup={() => openPopup('vendor-name')}
            onOpenCodePopup={() => openPopup('vendor-code')}
            onSelectVendor={selectVendor}
          />

          <LogisticsGrid
            salesEmployeeLabel="Sales Employee"
            salesEmployeeInput={salesEmployeeInput}
            salesEmployeesLoading={salesEmployeesQuery.isLoading}
            error={salesEmployeesQuery.isError ? 'Unable to load sales employees.' : null}
            salesEmployeeFocused={salesEmployeeFocused}
            salesEmployeeSuggestions={salesEmployeeSuggestions}
            onSalesEmployeeChange={handleSalesEmployeeChange}
            onSalesEmployeeFocus={() => setSalesEmployeeFocused(true)}
            onSalesEmployeeBlur={() => setTimeout(() => setSalesEmployeeFocused(false), 120)}
            onOpenSalesEmployeePopup={() => openPopup('sales-employee')}
            onSelectSalesEmployee={state.selectSalesEmployee}
          />

          <DocumentDatesGrid
            loading={false}
            docDate={header.docDate}
            docDueDate={header.docDueDate}
            today={new Date()}
            activeDatePicker={null}
            docDateContainerRef={docDateContainerRef}
            deliveryDateContainerRef={deliveryDateContainerRef}
            toDisplayDate={toDisplayDate}
            parseISODate={parseISODate}
            toISODate={toISODate}
            onSetActiveDatePicker={() => {}}
            onDocDateChange={(value) => setHeader({ docDate: value })}
            onDocDueDateChange={(value) => setHeader({ docDueDate: value })}
          />
        </div>

        {/* Row 2: Address | Reference — matches AR Invoice */}
        <div className="mt-3 grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
          <AddressGrid
            loading={false}
            billToAddress={header.billToAddress ?? ''}
            shipToAddress={header.shipToAddress ?? ''}
            readOnly={false}
            onBillToAddressChange={(value) => setHeader({ billToAddress: value })}
            onShipToAddressChange={(value) => setHeader({ shipToAddress: value })}
          />

          <ReferenceGrid
            loading={false}
            referenceNo={header.referenceNo}
            comments={header.comments}
            onReferenceNoChange={(value) => setHeader({ referenceNo: value })}
            onCommentsChange={(value) => setHeader({ comments: value })}
          />
        </div>

        {/* Row 3: Product lines with checkboxes + return reason */}
        <ArCreditMemoProductSection
          sectionId="ar-credit-memo-product-section"
          missingSearchMandatoryFields={missingSearchMandatoryFields}
          searchRequiredCompletionPercent={searchRequiredCompletionPercent}
          searchMandatoryFields={searchMandatoryFields}
          openProductPopup={productsHook.openProductPopup}
          prefetchProducts={productsHook.prefetchProducts}
          productRows={productsHook.productRows}
          productRowDrafts={productsHook.productRowDrafts}
          updateProductRow={productsHook.updateProductRow}
          removeProductRow={productsHook.removeProductRow}
          setProductRowDraft={productsHook.setProductRowDraft}
          clearProductRowDraft={productsHook.clearProductRowDraft}
          totals={totals}
          summaryCurrencyLabel={summaryCurrencyLabel}
          createError={createError}
          createDisabledReason={createDisabledReason}
          createArCreditMemoMutation={createArCreditMemoMutation}
          missingMandatoryFields={missingMandatoryFields}
          requiredCompletionPercent={requiredCompletionPercent}
          handleCreateOrder={handleCreateOrder}
          submitLabel={state.isEditMode ? 'Update' : 'Create'}
          submitLoadingText={state.isEditMode ? 'Updating...' : 'Creating...'}
          warehouses={warehouses}
          warehousesLoading={warehousesLoading}
        />

        <SharedCreateModals
          state={modalsState}
          entityLabels={{
            vendorPopupTitle: 'Search Customers',
            vendorErrorMsg: 'Unable to load customers',
          }}
        />
      </CreatePageWrapper>
    </div>
  )
}
