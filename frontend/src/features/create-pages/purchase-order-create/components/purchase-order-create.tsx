import { useQueryClient } from '@tanstack/react-query'
import { type MouseEvent } from 'react'

import { AddressGrid } from '@/features/create-pages/create-shared/components/grids/address-grid'
import { DocumentDatesGrid } from '@/features/create-pages/create-shared/components/grids/document-dates-grid'
import { LogisticsGrid } from '@/features/create-pages/create-shared/components/grids/logistics-grid'
import { ReferenceGrid } from '@/features/create-pages/create-shared/components/grids/reference-grid'
import { VendorCustomerGrid } from '@/features/create-pages/create-shared/components/grids/vendor-customer-grid'
import { CopyToDropdown } from '@/features/create-pages/create-shared/components/layout/copy-to-dropdown'
import { CreatePageWrapper } from '@/features/create-pages/create-shared/components/layout/create-page-wrapper'
import {
  parseISODate,
  toDisplayDate,
  toISODate,
} from '@/features/create-pages/create-shared/utils/create-order.utils'
import { PurchaseOrderModals } from '@/features/create-pages/purchase-order-create/components/purchase-order-modals'
import { PurchaseOrderProductSection } from '@/features/create-pages/purchase-order-create/components/purchase-order-product-section'
import { usePurchaseOrderCreate } from '@/features/create-pages/purchase-order-create/hooks/use-purchase-order-create'
import { purchaseOrderQueries } from '@/features/table-pages/purchase-orders/api/purchase-order.queries'

interface PurchaseOrderCreateProps {
  mode?: 'create' | 'edit'
  docNum?: string
}

/**
 * PurchaseOrderCreate: Orchestrator for the complex PO creation multi-step flow.
 * State is centralized in usePurchaseOrderCreate to keep the UI declarative and clean.
 * Leverages CreatePageWrapper for consistent entity layout.
 */
export function PurchaseOrderCreate({ mode = 'create', docNum }: PurchaseOrderCreateProps) {
  const queryClient = useQueryClient()
  const state = usePurchaseOrderCreate(docNum ? { mode, docNum } : { mode })

  const pageTitle = state.isEditMode
    ? `Update Purchase Order ${docNum || ''}`
    : 'Create Purchase Order'
  const isFormHydrating = !state.isEditMode
    ? state.vendorsQuery.isLoading &&
      state.warehousesQuery.isLoading &&
      state.salesEmployeesQuery.isLoading &&
      !state.vendorsQuery.data
    : (state.editDetailQuery.isLoading && !state.editDetailQuery.data) || !state.isEditHydrated

  const handleVendorRestrictedClick = state.isEditMode
    ? (event: MouseEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
        state.showEditRestrictedToast('Vendor Info')
      }
    : undefined

  return (
    <CreatePageWrapper
      rootLabel="Purchase"
      breadcrumbParent={{
        label: 'Purchase Orders',
        to: '/purchase/orders',
        onMouseEnter: () =>
          void queryClient.prefetchQuery(purchaseOrderQueries.list({ page: 1, limit: 10 })),
      }}
      pageTitle={pageTitle}
      editError={
        state.isEditMode && state.editDetailQuery.isError
          ? state.editDetailQuery.error instanceof Error
            ? state.editDetailQuery.error.message
            : 'Unable to load purchase order for editing.'
          : null
      }
    >
      <div className="grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
        <div
          onClickCapture={handleVendorRestrictedClick}
          className={`h-full ${state.isEditMode ? 'cursor-not-allowed' : ''}`}
        >
          <div className={`h-full ${state.isEditMode ? 'pointer-events-none' : ''}`}>
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
              nameDisabled={state.isEditMode}
              codeDisabled={state.isEditMode}
            />
          </div>
        </div>

        <div
          className={`h-full ${state.isClosed ? 'cursor-not-allowed' : ''}`}
          onClickCapture={
            state.isClosed
              ? (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  state.showEditRestrictedToast('Logistics')
                }
              : undefined
          }
        >
          <div className={`h-full ${state.isClosed ? 'pointer-events-none' : ''}`}>
            <LogisticsGrid
              salesEmployeeInput={state.salesEmployeeInput}
              salesEmployeesLoading={state.salesEmployeesQuery.isLoading || isFormHydrating}
              error={state.salesEmployeesQuery.isError ? 'Unable to load buyers.' : null}
              salesEmployeeFocused={state.salesEmployeeFocused}
              salesEmployeeSuggestions={state.salesEmployeeSuggestions}
              onSalesEmployeeChange={state.handleSalesEmployeeChange}
              onSalesEmployeeFocus={() => state.setSalesEmployeeFocused(true)}
              onSalesEmployeeBlur={() =>
                setTimeout(() => state.setSalesEmployeeFocused(false), 120)
              }
              onOpenSalesEmployeePopup={() => state.openPopup('sales-employee')}
              onSelectSalesEmployee={state.selectSalesEmployee}
              salesEmployeeDisabled={state.isClosed}
              readOnly={state.isClosed}
            />
          </div>
        </div>

        <DocumentDatesGrid
          loading={isFormHydrating}
          docDate={state.header.docDate}
          docDueDate={state.header.docDueDate}
          today={state.today}
          activeDatePicker={state.activeDatePicker}
          docDateContainerRef={state.docDateContainerRef}
          deliveryDateContainerRef={state.deliveryDateContainerRef}
          toDisplayDate={toDisplayDate}
          parseISODate={parseISODate}
          toISODate={toISODate}
          docDateReadOnly={false}
          docDueDateReadOnly={state.isClosed}
          onSetActiveDatePicker={state.setActiveDatePicker}
          onDocDateChange={(value) => state.setHeader({ docDate: value })}
          onDocDueDateChange={(value) => {
            state.setHeader({ docDueDate: value })
            state.setProductSearchFieldErrors((prev) => ({ ...prev, docDueDate: undefined }))
          }}
        />
      </div>

      <div className="mt-3 grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
        <div
          className={`h-full lg:col-span-2 ${state.isClosed ? 'cursor-not-allowed' : ''}`}
          onClickCapture={
            state.isClosed
              ? (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  state.showEditRestrictedToast('Address')
                }
              : undefined
          }
        >
          <div className={`h-full ${state.isClosed ? 'pointer-events-none' : ''}`}>
            <AddressGrid
              loading={isFormHydrating}
              billToAddress={state.billToAddress}
              shipToAddress={state.shipToAddress}
              readOnly={state.isClosed}
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
            />
          </div>
        </div>
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

      <PurchaseOrderProductSection
        sectionId="purchase-order-product-section"
        missingSearchMandatoryFields={state.missingSearchMandatoryFields}
        searchRequiredCompletionPercent={state.searchRequiredCompletionPercent}
        searchMandatoryFields={state.searchMandatoryFields}
        openProductPopup={state.openProductPopup}
        prefetchProducts={state.prefetchProducts}
        productRows={state.productRows}
        productRowDrafts={state.productRowDrafts}
        warehouses={state.warehouses}
        warehousesLoading={state.warehousesQuery.isLoading}
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
        isEditMode={state.isEditMode}
        isClosed={state.isClosed}
        allowSearchInEditMode={state.isEditMode}
        submitLabel={state.isEditMode ? 'Update' : 'Create'}
        submitLoadingText={state.isEditMode ? 'Updating...' : 'Creating...'}
        secondaryActions={
          state.isEditMode && !state.isClosed ? (
            <CopyToDropdown
              docNum={docNum!}
              sourceDocType="PurchaseOrder"
              targets={['GRPO', 'AP Invoice']}
            />
          ) : null
        }
      />
      <PurchaseOrderModals state={state} />
    </CreatePageWrapper>
  )
}
