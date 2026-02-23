import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { goeyToast } from 'goey-toast'
import { ChevronRight } from 'lucide-react'

import { CreatePageRouteSkeleton } from '@/components/skeleton/create-page-route-skeleton'
import { ARInvoiceModals } from '@/features/create-pages/ar-invoice-create/components/ar-invoice-modals'
import { ARInvoiceProductSection } from '@/features/create-pages/ar-invoice-create/components/ar-invoice-product-section'
import { useARInvoiceCreate } from '@/features/create-pages/ar-invoice-create/hooks/use-ar-invoice-create'
import { AddressGrid } from '@/features/create-pages/create-shared/components/grids/address-grid'
import { DocumentDetailsGrid } from '@/features/create-pages/create-shared/components/grids/document-details-grid'
import { ReferenceGrid } from '@/features/create-pages/create-shared/components/grids/reference-grid'
import { VendorCustomerGrid } from '@/features/create-pages/create-shared/components/grids/vendor-customer-grid'
import { WarehouseLogisticsGrid } from '@/features/create-pages/create-shared/components/grids/warehouse-logistics-grid'
import { useBackendLoadingToast } from '@/features/create-pages/create-shared/utils/backend-loading-toast'
import {
  parseISODate,
  toDisplayDate,
  toISODate,
} from '@/features/create-pages/create-shared/utils/create-order.utils'
import { arInvoiceQueries } from '@/features/table-pages/ar-invoices/api/ar-invoice.queries'
import { useSetSidebarAction } from '@/store/sidebar/sidebar.store'

export function ARInvoiceCreate() {
  const state = useARInvoiceCreate()
  const queryClient = useQueryClient()
  const setSidebarOpen = useSetSidebarAction()
  const backendLoading =
    state.vendorsQuery.isLoading ||
    state.warehousesQuery.isLoading ||
    state.salesEmployeesQuery.isLoading

  useBackendLoadingToast({
    loading: backendLoading,
    loadingMessage: 'Loading A/R invoice create data...',
    errorMessage: null,
  })

  const isInitialCreateLoading =
    state.vendorsQuery.isLoading &&
    state.warehousesQuery.isLoading &&
    state.salesEmployeesQuery.isLoading &&
    !state.vendorsQuery.data &&
    !state.warehousesQuery.data &&
    !state.salesEmployeesQuery.data

  if (isInitialCreateLoading) {
    return <CreatePageRouteSkeleton />
  }

  return (
    <div className="w-full bg-zinc-50 p-3 pb-20">
      <div className="mb-3 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white/85 px-4 py-2 text-xs font-medium tracking-normal text-zinc-600 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.32)] backdrop-blur-sm">
        <button
          type="button"
          className="cursor-pointer text-blue-600 hover:text-blue-700"
          onClick={() => setSidebarOpen(true)}
        >
          Sales
        </button>
        <ChevronRight className="size-3.5 text-zinc-300" />
        <Link
          to="/sales/ar-invoice"
          search={{ page: 1, limit: 10 }}
          className="cursor-pointer text-blue-600 hover:text-blue-700"
          onMouseEnter={() =>
            void queryClient.prefetchQuery(arInvoiceQueries.list({ page: 1, limit: 10 }))
          }
          onFocus={() =>
            void queryClient.prefetchQuery(arInvoiceQueries.list({ page: 1, limit: 10 }))
          }
        >
          A/R Invoice Data Table
        </Link>
        <ChevronRight className="size-3.5 text-zinc-300" />
        <span className="text-zinc-700">Create A/R Invoice</span>
      </div>

      <div className="grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
        <VendorCustomerGrid
          loading={state.vendorsQuery.isLoading}
          error={
            state.vendorsQuery.isError
              ? state.vendorsQuery.error instanceof Error
                ? state.vendorsQuery.error.message
                : 'Unable to load customers. Please login again.'
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
          sectionTitle="Customer Info"
          nameLabel="Customer Name *"
          codeLabel="Customer Code *"
          namePlaceholder="Select or Type Customer"
          codePlaceholder="Select or Type Code"
          nameLoadingPlaceholder="Loading customer names..."
          codeLoadingPlaceholder="Loading customer codes..."
          onOpenNamePopup={() => state.openPopup('vendor-name')}
          onOpenCodePopup={() => state.openPopup('vendor-code')}
          onSelectVendor={state.selectVendor}
          vendorNameInvalid={Boolean(state.productSearchFieldErrors.vendorName)}
          vendorCodeInvalid={Boolean(state.productSearchFieldErrors.vendorCode)}
          vendorNameErrorText={state.productSearchFieldErrors.vendorName}
          vendorCodeErrorText={state.productSearchFieldErrors.vendorCode}
        />

        <WarehouseLogisticsGrid
          salesEmployeeLabel="Sales Employee *"
          salesEmployeePlaceholder="Select Sales Employee"
          salesEmployeeLoadingPlaceholder="Loading sales employees..."
          warehouseInput={state.warehouseInput}
          salesEmployeeInput={state.salesEmployeeInput}
          warehouseLoading={state.warehousesQuery.isLoading}
          salesEmployeesLoading={state.salesEmployeesQuery.isLoading}
          error={
            state.warehousesQuery.isError
              ? 'Unable to load warehouses.'
              : state.salesEmployeesQuery.isError
                ? 'Unable to load sales employees.'
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

      <ARInvoiceProductSection
        sectionId="ar-invoice-product-section"
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
        createARInvoiceMutation={state.createARInvoiceMutation}
        missingMandatoryFields={state.missingMandatoryFields}
        requiredCompletionPercent={state.requiredCompletionPercent}
        handleCreateOrder={state.handleCreateOrder}
      />
      <ARInvoiceModals state={state} />
    </div>
  )
}
