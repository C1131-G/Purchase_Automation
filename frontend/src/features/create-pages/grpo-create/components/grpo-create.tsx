import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { goeyToast } from 'goey-toast'
import { ChevronRight } from 'lucide-react'
import { type MouseEvent } from 'react'

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
import { GRPOModals } from '@/features/create-pages/grpo-create/components/grpo-modals'
import { GRPOProductSection } from '@/features/create-pages/grpo-create/components/grpo-product-section'
import { useGRPOCreate } from '@/features/create-pages/grpo-create/hooks/use-grpo-create'
import { grpoQueries } from '@/features/table-pages/grpo/api/grpo.queries'
import { useSetSidebarAction } from '@/store/sidebar/sidebar.store'

interface GRPOCreateProps {
  mode?: 'create' | 'edit'
  docNum?: string
}

export function GRPOCreate({ mode = 'create', docNum }: GRPOCreateProps) {
  const state = useGRPOCreate(docNum ? { mode, docNum } : { mode })
  const queryClient = useQueryClient()
  const setSidebarOpen = useSetSidebarAction()

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

  if (state.isEditMode && state.editDetailQuery.isError) {
    const errorMessage =
      state.editDetailQuery.error instanceof Error
        ? state.editDetailQuery.error.message
        : 'Unable to load GRPO for editing.'
    return (
      <div className="w-full bg-zinc-50 p-3 pb-20">
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      </div>
    )
  }

  const handleRestrictedClick = state.isEditMode
    ? (fieldName: string) => (event: MouseEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      state.showEditRestrictedToast(fieldName)
    }
    : undefined

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
          to="/purchase/grpo"
          search={{ page: 1, limit: 10 }}
          className="cursor-pointer text-blue-600 hover:text-blue-700"
          onMouseEnter={() =>
            void queryClient.prefetchQuery(grpoQueries.list({ page: 1, limit: 10 }))
          }
          onFocus={() => void queryClient.prefetchQuery(grpoQueries.list({ page: 1, limit: 10 }))}
        >
          GRPO Data Table
        </Link>
        <ChevronRight className="size-3.5 text-zinc-300" />
        <span className="text-zinc-700">{state.isEditMode ? 'Update GRPO' : 'Create GRPO'}</span>
      </div>

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
              onOpenNamePopup={() => state.setVendorNameFocused(true)}
              onOpenCodePopup={() => state.setVendorCodeFocused(true)}
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
            <WarehouseLogisticsGrid
              warehouseInput={state.warehouseInput}
              salesEmployeeInput={state.buyerInput}
              warehouseLoading={state.warehousesQuery.isLoading || isFormHydrating}
              salesEmployeesLoading={state.salesEmployeesQuery.isLoading || isFormHydrating}
              warehouseFocused={state.warehouseFocused}
              salesEmployeeFocused={state.buyerFocused}
              warehouseSuggestions={state.warehouseSuggestions}
              salesEmployeeSuggestions={state.buyerSuggestions}
              onWarehouseChange={state.setWarehouseInput}
              onSalesEmployeeChange={state.setBuyerInput}
              onWarehouseFocus={() => state.setWarehouseFocused(true)}
              onSalesEmployeeFocus={() => state.setBuyerFocused(true)}
              onWarehouseBlur={() => setTimeout(() => state.setWarehouseFocused(false), 120)}
              onSalesEmployeeBlur={() => setTimeout(() => state.setBuyerFocused(false), 120)}
              onOpenWarehousePopup={() => state.setWarehouseFocused(true)}
              onOpenSalesEmployeePopup={() => state.setBuyerFocused(true)}
              onSelectWarehouse={state.selectWarehouse}
              onSelectSalesEmployee={state.selectBuyer}
              salesEmployeeLabel="Buyer *"
              salesEmployeePlaceholder="Select Buyer"
              salesEmployeeLoadingPlaceholder="Loading buyers..."
              salesEmployeeInvalid={Boolean(state.fieldErrors.salesEmployee)}
              warehouseInvalid={Boolean(state.fieldErrors.warehouseCode)}
              salesEmployeeErrorText={state.fieldErrors.salesEmployee}
              warehouseErrorText={state.fieldErrors.warehouseCode}
              warehouseLocked={state.isEditMode}
              onWarehouseLockedClick={() =>
                goeyToast('Warehouse is fixed in edit mode. Update lines if needed.')
              }
              warehouseDisabled={state.isEditMode}
              salesEmployeeDisabled={state.isEditMode}
            />
          </div>
        </div>

        <DocumentDetailsGrid
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
          docDueDateInvalid={Boolean(state.fieldErrors.docDueDate)}
          docDueDateErrorText={state.fieldErrors.docDueDate}
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
              billToAddressInvalid={Boolean(state.fieldErrors.billToAddress)}
              shipToAddressInvalid={Boolean(state.fieldErrors.shipToAddress)}
              billToAddressErrorText={state.fieldErrors.billToAddress}
              shipToAddressErrorText={state.fieldErrors.shipToAddress}
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
        effectiveWarehouseCode={state.effectiveWarehouseCode}
        createError={state.createError}
        createDisabledReason={state.createDisabledReason}
        missingSearchMandatoryFields={state.missingSearchMandatoryFields}
        searchRequiredCompletionPercent={state.searchRequiredCompletionPercent}
        searchMandatoryFields={state.searchMandatoryFields}
        missingMandatoryFields={state.missingMandatoryFields}
        requiredCompletionPercent={state.requiredCompletionPercent}
        requiredFieldsTotal={state.requiredFieldsTotal}
        requiredFieldLabelText={state.requiredFieldLabelText}
        openProductPopup={state.openProductPopup}
        openStockPreview={state.openStockPreview}
        prefetchProducts={state.prefetchProducts}
        isSubmitting={
          state.isEditMode ? state.updateMutation.isPending : state.createMutation.isPending
        }
        isEditMode={state.isEditMode}
        onUpdateProductRow={state.updateProductRow}
        onRemoveProductRow={state.removeProductRow}
        onSetProductRowDraft={state.setProductRowDraft}
        onClearProductRowDraft={state.clearProductRowDraft}
        onSubmit={state.handleCreateGRPO}
        onEditRestrictedClick={state.showEditRestrictedToast}
      />

      <GRPOModals state={state} />
    </div>
  )
}

export default GRPOCreate
