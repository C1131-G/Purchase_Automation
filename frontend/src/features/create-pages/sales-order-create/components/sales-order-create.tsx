import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
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
import { SalesOrderModals } from '@/features/create-pages/sales-order-create/components/sales-order-modals'
import { SalesOrderProductSection } from '@/features/create-pages/sales-order-create/components/sales-order-product-section'
import { useSalesOrderCreate } from '@/features/create-pages/sales-order-create/hooks/use-sales-order-create'
import { salesOrderQueries } from '@/features/table-pages/sales-orders/api/sales-order.queries'

// SalesOrderCreate: Primary view for sales order entry, mirroring the PO architectural pattern.
// Leverages a shared creation-hook pattern for consistent validation and error handling.
export function SalesOrderCreate() {
  const state = useSalesOrderCreate()
  const queryClient = useQueryClient()

  return (
    <div className="w-full bg-zinc-50 p-3 pb-20">
      <div className="mb-3 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white/85 px-4 py-2 text-xs font-medium tracking-normal text-zinc-600 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.32)] backdrop-blur-sm">
        <span>Sales</span>
        <ChevronRight className="size-3.5 text-zinc-300" />
        <Link
          to="/sales/orders"
          search={{ page: 1, limit: 10 }}
          className="text-blue-600 hover:text-blue-700"
          onMouseEnter={() =>
            void queryClient.prefetchQuery(salesOrderQueries.list({ page: 1, limit: 10 }))
          }
          onFocus={() =>
            void queryClient.prefetchQuery(salesOrderQueries.list({ page: 1, limit: 10 }))
          }
        >
          Sales Orders Data Table
        </Link>
        <ChevronRight className="size-3.5 text-zinc-300" />
        <span className="text-zinc-700">Create Sales Order</span>
      </div>

      {/* Information Layer: Grid-based metadata input with predictive lookups. */}
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

      {/* Execution Layer: Table-based line item management and order finalization. */}
      <SalesOrderProductSection
        sectionId="sales-order-product-section"
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
        createSalesOrderMutation={state.createSalesOrderMutation}
        missingMandatoryFields={state.missingMandatoryFields}
        requiredCompletionPercent={state.requiredCompletionPercent}
        handleCreateOrder={state.handleCreateOrder}
      />
      <SalesOrderModals state={state} />
    </div>
  )
}
