import { useQueryClient } from '@tanstack/react-query'
import { type MouseEvent } from 'react'

import { AddressGrid } from '@/features/create-pages/create-shared/components/grids/address-grid'
import { DocumentDatesGrid } from '@/features/create-pages/create-shared/components/grids/document-dates-grid'
import { LogisticsGrid } from '@/features/create-pages/create-shared/components/grids/logistics-grid'
import { ReferenceGrid } from '@/features/create-pages/create-shared/components/grids/reference-grid'
import { VendorCustomerGrid } from '@/features/create-pages/create-shared/components/grids/vendor-customer-grid'
import { CreatePageWrapper } from '@/features/create-pages/create-shared/components/layout/create-page-wrapper'
import { PURCHASE_ORDER_MANDATORY_FIELDS } from '@/features/create-pages/create-shared/config/create-mandatory-fields'
import {
  parseISODate,
  toDisplayDate,
  toISODate,
} from '@/features/create-pages/create-shared/utils/create-order.utils'
import { GRPOModals } from '@/features/create-pages/grpo-create/components/grpo-modals'
import { GRPOProductSection } from '@/features/create-pages/grpo-create/components/grpo-product-section'
import { useGRPOCreate } from '@/features/create-pages/grpo-create/hooks/use-grpo-create'
import { REQUIRED_FIELD_LABEL_TEXT } from '@/features/create-pages/grpo-create/utils/grpo-create.utils'
import { grpoQueries } from '@/features/table-pages/grpo/api/grpo.queries'

interface GRPOCreateProps {
  mode?: 'create' | 'edit'
  docNum?: string
}

/**
 * GRPOCreate: Orchestrator for the complex GRPO creation multi-step flow.
 * State is managed by useGRPOCreate.
 * Leverages CreatePageWrapper for consistent entity layout and error boundaries.
 */
export function GRPOCreate({ mode = 'create', docNum }: GRPOCreateProps) {
  const queryClient = useQueryClient()
  const state = useGRPOCreate(docNum ? { mode, docNum } : { mode })

  const pageTitle = state.isEditMode ? 'Update GRPO' : 'Create GRPO'

  const isInitialCreateLoading =
    !state.isEditMode &&
    state.vendorsQuery.isLoading &&
    state.warehousesQuery.isLoading &&
    state.salesEmployeesQuery.isLoading &&
    !state.vendorsQuery.data &&
    !state.warehousesQuery.data &&
    !state.salesEmployeesQuery.data &&
    !state.vendorNameInput.trim() &&
    !state.vendorCodeInput.trim()

  const isEditHydrationPending = state.isEditMode && !state.isEditHydrated

  const isFormHydrating =
    isInitialCreateLoading ||
    (state.isEditMode &&
      ((state.editDetailQuery.isLoading && !state.editDetailQuery.data) || isEditHydrationPending))

  const handleRestrictedClick = state.isEditMode
    ? (fieldName: string) => (event: MouseEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
        state.showEditRestrictedToast(fieldName)
      }
    : undefined

  return (
    <CreatePageWrapper
      rootLabel="Purchase"
      breadcrumbParent={{
        label: 'GRPO Data Table',
        to: '/purchase/grpo',
        onMouseEnter: () =>
          void queryClient.prefetchQuery(grpoQueries.list({ page: 1, limit: 10 })),
      }}
      pageTitle={pageTitle}
      editError={
        state.isEditMode && state.editDetailQuery.isError
          ? state.editDetailQuery.error instanceof Error
            ? state.editDetailQuery.error.message
            : 'Unable to load GRPO for editing.'
          : null
      }
    >
      <div className="grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
        <div
          onClickCapture={handleRestrictedClick?.('Vendor Info')}
          className={`h-full ${state.isEditMode ? 'cursor-not-allowed' : ''}`}
        >
          <div className={`h-full ${state.isEditMode ? 'pointer-events-none' : ''}`}>
            <VendorCustomerGrid
              loading={state.vendorsQuery.isLoading || isFormHydrating}
              error={null}
              nameInput={state.vendorNameInput}
              codeInput={state.vendorCodeInput}
              nameFocused={state.vendorNameFocused}
              codeFocused={state.vendorCodeFocused}
              nameSuggestions={state.vendorNameSuggestions}
              codeSuggestions={state.vendorCodeSuggestions}
              onNameChange={state.handleVendorNameChange}
              onCodeChange={state.handleVendorCodeChange}
              onNameFocus={() => state.setVendorNameFocused(true)}
              onCodeFocus={() => state.setVendorCodeFocused(true)}
              onNameBlur={() => setTimeout(() => state.setVendorNameFocused(false), 120)}
              onCodeBlur={() => setTimeout(() => state.setVendorCodeFocused(false), 120)}
              onOpenNamePopup={() => state.openPopup('vendor-name')}
              onOpenCodePopup={() => state.openPopup('vendor-code')}
              onSelectVendor={state.selectVendor}
              vendorNameInvalid={Boolean(state.fieldErrors.vendorName)}
              vendorCodeInvalid={Boolean(state.fieldErrors.vendorCode)}
              vendorNameErrorText={state.fieldErrors.vendorName}
              vendorCodeErrorText={state.fieldErrors.vendorCode}
              nameDisabled={state.isEditMode}
              codeDisabled={state.isEditMode}
            />
          </div>
        </div>

        <div
          onClickCapture={handleRestrictedClick?.('Warehouse & Logistics')}
          className={`h-full ${state.isEditMode ? 'cursor-not-allowed' : ''}`}
        >
          <div className={`h-full ${state.isEditMode ? 'pointer-events-none' : ''}`}>
            <LogisticsGrid
              salesEmployeeInput={state.buyerInput}
              salesEmployeesLoading={state.salesEmployeesQuery.isLoading || isFormHydrating}
              salesEmployeeFocused={state.buyerFocused}
              salesEmployeeSuggestions={state.buyerSuggestions}
              onSalesEmployeeChange={state.setBuyerInput}
              onSalesEmployeeFocus={() => state.setBuyerFocused(true)}
              onSalesEmployeeBlur={() => setTimeout(() => state.setBuyerFocused(false), 120)}
              onOpenSalesEmployeePopup={() => state.openPopup('sales-employee')}
              onSelectSalesEmployee={state.selectBuyer}
              salesEmployeeLabel="Buyer"
              salesEmployeePlaceholder="Select Buyer"
              salesEmployeeLoadingPlaceholder="Loading buyers..."
              salesEmployeeDisabled={state.isEditMode}
            />
          </div>
        </div>

        <DocumentDatesGrid
          docDate={state.docDate}
          docDueDate={state.docDueDate}
          loading={isFormHydrating}
          today={state.today}
          activeDatePicker={state.activeDatePicker}
          docDateContainerRef={state.docDateContainerRef}
          deliveryDateContainerRef={state.deliveryDateContainerRef}
          toDisplayDate={toDisplayDate}
          parseISODate={parseISODate}
          toISODate={toISODate}
          onSetActiveDatePicker={(value) => {
            if (!state.isEditMode) {
              state.setActiveDatePicker(value)
              return
            }
            state.setActiveDatePicker((prev) => {
              const next = typeof value === 'function' ? value(prev) : value
              if (next === 'doc') {
                state.showEditRestrictedToast('Document Date')
                return null
              }
              return next
            })
          }}
          onDocDateChange={state.handleDocDateChange}
          onDocDueDateChange={state.handleDocDueDateChange}
          docDateReadOnly={state.isEditMode}
          docDueDateEditableHighlight={state.isEditMode}
        />
      </div>

      <div className="mt-3 grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
        <div
          className={`h-full lg:col-span-2 ${state.isEditMode ? 'cursor-not-allowed' : ''}`}
          onClickCapture={handleRestrictedClick?.('Address')}
        >
          <div className={`h-full ${state.isEditMode ? 'pointer-events-none' : ''}`}>
            <AddressGrid
              className="h-full"
              loading={isFormHydrating}
              billToAddress={state.billToAddress}
              shipToAddress={state.shipToAddress}
              readOnly={state.isEditMode}
              onBillToAddressChange={state.setBillToAddress}
              onShipToAddressChange={state.setShipToAddress}
            />
          </div>
        </div>
        <div className="h-full">
          <ReferenceGrid
            loading={isFormHydrating}
            referenceNo={state.referenceNo}
            comments={state.remarks}
            referenceNoDisabled={state.isEditMode}
            onReferenceNoDisabledClick={() => state.setReferenceNo(state.referenceNo)}
            onReferenceNoChange={state.setReferenceNo}
            onCommentsChange={state.setRemarks}
            commentsEditableHighlight={state.isEditMode}
            referenceNoInvalid={Boolean(state.fieldErrors.referenceNo)}
            commentsInvalid={Boolean(state.fieldErrors.comments)}
            referenceNoErrorText={state.fieldErrors.referenceNo}
            commentsErrorText={state.fieldErrors.comments}
          />
        </div>
      </div>

      <GRPOProductSection
        rows={state.rows}
        productRowDrafts={state.productRowDrafts}
        createError={state.createError}
        createDisabledReason={state.createDisabledReason}
        missingSearchMandatoryFields={state.missingSearchMandatoryFields}
        searchRequiredCompletionPercent={state.searchRequiredCompletionPercent}
        searchMandatoryFields={state.searchMandatoryFields}
        missingMandatoryFields={state.missingMandatoryFields}
        requiredCompletionPercent={state.requiredCompletionPercent}
        requiredFieldsTotal={PURCHASE_ORDER_MANDATORY_FIELDS.length}
        requiredFieldLabelText={REQUIRED_FIELD_LABEL_TEXT}
        openProductPopup={state.openProductPopup}
        prefetchProducts={state.prefetchProducts}
        isSubmitting={
          state.isEditMode
            ? (state.updateMutation as any).isPending
            : (state.createMutation as any).isPending
        }
        isEditMode={state.isEditMode}
        onUpdateProductRow={state.updateProductRow}
        onRemoveProductRow={state.removeProductRow}
        onSetProductRowDraft={state.setProductRowDraft}
        onClearProductRowDraft={state.clearProductRowDraft}
        onSubmit={state.handleCreateOrder}
        warehouses={state.warehouses}
        warehousesLoading={state.warehousesQuery.isLoading || isFormHydrating}
        onEditRestrictedClick={state.showEditRestrictedToast}
      />

      <GRPOModals state={state} />
    </CreatePageWrapper>
  )
}

export default GRPOCreate
