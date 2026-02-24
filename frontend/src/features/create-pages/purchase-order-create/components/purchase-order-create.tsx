import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { goeyToast } from 'goey-toast'
// PurchaseOrderCreate: Orchestrates the entire PO creation lifecycle.
import { ChevronRight } from 'lucide-react'

import { AddressGrid } from '@/features/create-pages/create-shared/components/grids/address-grid'
import { DocumentDetailsGrid } from '@/features/create-pages/create-shared/components/grids/document-details-grid'
import { ReferenceGrid } from '@/features/create-pages/create-shared/components/grids/reference-grid'
import { VendorCustomerGrid } from '@/features/create-pages/create-shared/components/grids/vendor-customer-grid'
import { WarehouseLogisticsGrid } from '@/features/create-pages/create-shared/components/grids/warehouse-logistics-grid'
import {
  parseISODate,
  toDisplayDate,
  toISODate,
} from '@/features/create-pages/create-shared/utils/create-order.utils'
import { PurchaseOrderModals } from '@/features/create-pages/purchase-order-create/components/purchase-order-modals'
import { PurchaseOrderProductSection } from '@/features/create-pages/purchase-order-create/components/purchase-order-product-section'
import { usePurchaseOrderCreate } from '@/features/create-pages/purchase-order-create/hooks/use-purchase-order-create'
import { purchaseOrderQueries } from '@/features/table-pages/purchase-orders/api/purchase-order.queries'
import { useSetSidebarAction } from '@/store/sidebar/sidebar.store'

// PurchaseOrderCreate: Orchestrator for the complex PO creation multi-step flow.
// State is centralized in usePurchaseOrderCreate to keep the UI declarative and clean.
interface PurchaseOrderCreateProps {
  mode?: 'create' | 'edit'
  docNum?: string
}

export function PurchaseOrderCreate({ mode = 'create', docNum }: PurchaseOrderCreateProps) {
  const queryClient = useQueryClient()
  const setSidebarOpen = useSetSidebarAction()

  const state = usePurchaseOrderCreate(docNum ? { mode, docNum } : { mode })
  const pageTitle = state.isEditMode ? 'Update Purchase Order' : 'Create Purchase Order'
  const isInitialCreateLoading =
    !state.isEditMode &&
    state.vendorsQuery.isLoading &&
    state.warehousesQuery.isLoading &&
    state.salesEmployeesQuery.isLoading &&
    !state.vendorsQuery.data &&
    !state.warehousesQuery.data &&
    !state.salesEmployeesQuery.data
  const isEditHydrationPending =
    state.isEditMode &&
    Boolean(state.editDetailQuery.data) &&
    !state.nameInput.trim() &&
    !state.codeInput.trim() &&
    state.productRows.length === 0

  const isFormHydrating =
    isInitialCreateLoading ||
    (state.isEditMode &&
      ((state.editDetailQuery.isLoading && !state.editDetailQuery.data) || isEditHydrationPending))

  if (state.isEditMode && state.editDetailQuery.isError) {
    const errorMessage =
      state.editDetailQuery.error instanceof Error
        ? state.editDetailQuery.error.message
        : 'Unable to load purchase order for editing.'
    return (
      <div className="w-full bg-zinc-50 p-3 pb-20">
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full bg-zinc-50 p-3 pb-20">
      <div className="mb-3 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white/85 px-4 py-2 text-xs font-medium tracking-normal text-zinc-600 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.32)] backdrop-blur-sm">
        <button
          type="button"
          className="cursor-pointer text-blue-600 hover:text-blue-700"
          onClick={() => setSidebarOpen(true)}
        >
          Purchase
        </button>
        <ChevronRight className="size-3.5 text-zinc-300" />
        <Link
          to="/purchase/orders"
          search={{ page: 1, limit: 10 }}
          className="cursor-pointer text-blue-600 hover:text-blue-700"
          onMouseEnter={() =>
            void queryClient.prefetchQuery(purchaseOrderQueries.list({ page: 1, limit: 10 }))
          }
          onFocus={() =>
            void queryClient.prefetchQuery(purchaseOrderQueries.list({ page: 1, limit: 10 }))
          }
        >
          Purchase Orders Data Table
        </Link>
        <ChevronRight className="size-3.5 text-zinc-300" />
        <span className="text-zinc-700">{pageTitle}</span>
      </div>

      {/* Header Grid: Captures primary metadata (Vendor, Logistics, Dates). */}
      <div className="grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
        <VendorCustomerGrid
          loading={state.vendorsQuery.isLoading || isFormHydrating}
          error={
            state.vendorsQuery.isError
              ? state.vendorsQuery.error instanceof Error
                ? state.vendorsQuery.error.message
                : 'Unable to load vendors. Please login again.'
              : null
          }
          nameInput={state.nameInput}
          codeInput={state.codeInput}
          nameFocused={state.nameFocused}
          codeFocused={state.codeFocused}
          nameSuggestions={state.nameSuggestions}
          codeSuggestions={state.codeSuggestions}
          onNameChange={state.handleVendorNameChange}
          onCodeChange={state.handleVendorCodeChange}
          onNameFocus={() => state.setNameFocused(true)}
          onCodeFocus={() => state.setCodeFocused(true)}
          onNameBlur={() => setTimeout(() => state.setNameFocused(false), 120)}
          onCodeBlur={() => setTimeout(() => state.setCodeFocused(false), 120)}
          onOpenNamePopup={() => state.openPopup('vendor-name')}
          onOpenCodePopup={() => state.openPopup('vendor-code')}
          onSelectVendor={state.selectVendor}
          vendorNameInvalid={Boolean(state.productSearchFieldErrors.vendorName)}
          vendorCodeInvalid={Boolean(state.productSearchFieldErrors.vendorCode)}
          vendorNameErrorText={state.productSearchFieldErrors.vendorName}
          vendorCodeErrorText={state.productSearchFieldErrors.vendorCode}
        />

        <WarehouseLogisticsGrid
          warehouseInput={state.warehouseInput}
          salesEmployeeInput={state.salesEmployeeInput}
          warehouseLoading={state.warehousesQuery.isLoading || isFormHydrating}
          salesEmployeesLoading={state.salesEmployeesQuery.isLoading || isFormHydrating}
          error={
            state.warehousesQuery.isError
              ? 'Unable to load warehouses.'
              : state.salesEmployeesQuery.isError
                ? 'Unable to load buyers.'
                : null
          }
          warehouseFocused={state.warehouseFocused}
          salesEmployeeFocused={state.salesEmployeeFocused}
          warehouseSuggestions={state.warehouseSuggestions}
          salesEmployeeSuggestions={state.salesEmployeeSuggestions}
          onWarehouseChange={state.handleWarehouseChange}
          onSalesEmployeeChange={state.handleSalesEmployeeChange}
          onWarehouseFocus={() => state.setWarehouseFocused(true)}
          onSalesEmployeeFocus={() => state.setSalesEmployeeFocused(true)}
          onWarehouseBlur={() => setTimeout(() => state.setWarehouseFocused(false), 120)}
          onSalesEmployeeBlur={() => setTimeout(() => state.setSalesEmployeeFocused(false), 120)}
          onOpenWarehousePopup={() => state.openPopup('warehouse')}
          onOpenSalesEmployeePopup={() => state.openPopup('sales-employee')}
          onSelectWarehouse={state.selectWarehouse}
          onSelectSalesEmployee={state.selectSalesEmployee}
          warehouseInvalid={Boolean(state.productSearchFieldErrors.warehouseCode)}
          salesEmployeeInvalid={Boolean(state.productSearchFieldErrors.salesEmployee)}
          warehouseErrorText={state.productSearchFieldErrors.warehouseCode}
          salesEmployeeErrorText={state.productSearchFieldErrors.salesEmployee}
          warehouseLocked={state.productRows.length > 0}
          onWarehouseLockedClick={() =>
            goeyToast(
              "Warehouse can't be changed after product selection. Remove products or create.",
            )
          }
        />

        <DocumentDetailsGrid
          docDate={state.header.docDate}
          docDueDate={state.header.docDueDate}
          today={state.today}
          activeDatePicker={state.activeDatePicker}
          docDateContainerRef={state.docDateContainerRef}
          deliveryDateContainerRef={state.deliveryDateContainerRef}
          toDisplayDate={toDisplayDate}
          parseISODate={parseISODate}
          toISODate={toISODate}
          onSetActiveDatePicker={state.setActiveDatePicker}
          onDocDateChange={(value) => state.setHeader({ docDate: value })}
          onDocDueDateChange={(value) => {
            state.setHeader({ docDueDate: value })
            state.setProductSearchFieldErrors((prev) => ({ ...prev, docDueDate: undefined }))
          }}
          docDueDateInvalid={Boolean(state.productSearchFieldErrors.docDueDate)}
          {...(state.productSearchFieldErrors.docDueDate
            ? { docDueDateErrorText: state.productSearchFieldErrors.docDueDate }
            : {})}
        />
      </div>

      <div className="mt-3 grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
        <AddressGrid
          loading={isFormHydrating}
          billToAddress={state.billToAddress}
          shipToAddress={state.shipToAddress}
          onBillToAddressChange={(value) => {
            state.setBillToAddress(value)
            state.setProductSearchFieldErrors((prev) => ({
              ...prev,
              billToAddress: value.trim() ? undefined : prev.billToAddress,
            }))
          }}
          onShipToAddressChange={(value) => {
            state.setShipToAddress(value)
            state.setProductSearchFieldErrors((prev) => ({
              ...prev,
              shipToAddress: value.trim() ? undefined : prev.shipToAddress,
            }))
          }}
          billToAddressInvalid={Boolean(state.productSearchFieldErrors.billToAddress)}
          shipToAddressInvalid={Boolean(state.productSearchFieldErrors.shipToAddress)}
          billToAddressErrorText={state.productSearchFieldErrors.billToAddress}
          shipToAddressErrorText={state.productSearchFieldErrors.shipToAddress}
        />
        <ReferenceGrid
          loading={isFormHydrating}
          referenceNo={state.header.referenceNo}
          comments={state.header.comments}
          onReferenceNoChange={(value) => {
            state.setHeader({ referenceNo: value })
            state.setProductSearchFieldErrors((prev) => ({ ...prev, referenceNo: undefined }))
          }}
          onCommentsChange={(value) => {
            state.setHeader({ comments: value })
            state.setProductSearchFieldErrors((prev) => ({ ...prev, comments: undefined }))
          }}
          referenceNoInvalid={Boolean(state.productSearchFieldErrors.referenceNo)}
          commentsInvalid={Boolean(state.productSearchFieldErrors.comments)}
          referenceNoErrorText={state.productSearchFieldErrors.referenceNo}
          commentsErrorText={state.productSearchFieldErrors.comments}
        />
      </div>

      {/* Product Section: Handles line items, real-time totals, and final submission. */}
      <PurchaseOrderProductSection
        sectionId="purchase-order-product-section"
        missingSearchMandatoryFields={state.missingSearchMandatoryFields}
        searchRequiredCompletionPercent={state.searchRequiredCompletionPercent}
        searchMandatoryFields={state.searchMandatoryFields}
        openProductPopup={state.openProductPopup}
        prefetchProducts={state.prefetchProducts}
        productRows={state.productRows}
        productRowDrafts={state.productRowDrafts}
        effectiveWarehouseCode={state.effectiveWarehouseCode}
        openStockPreview={state.openStockPreview}
        updateProductRow={state.updateProductRow}
        removeProductRow={state.removeProductRow}
        setProductRowDraft={state.setProductRowDraft}
        clearProductRowDraft={state.clearProductRowDraft}
        totals={state.totals}
        summaryCurrencyLabel={state.summaryCurrencyLabel}
        createError={state.createError}
        createDisabledReason={state.createDisabledReason}
        createPurchaseOrderMutation={state.createPurchaseOrderMutation}
        missingMandatoryFields={state.missingMandatoryFields}
        requiredCompletionPercent={state.requiredCompletionPercent}
        handleCreateOrder={state.handleCreateOrder}
        submitLabel={state.isEditMode ? 'Update' : 'Create'}
        submitLoadingText={state.isEditMode ? 'Updating...' : 'Creating...'}
      />
      <PurchaseOrderModals state={state} />
    </div>
  )
}
