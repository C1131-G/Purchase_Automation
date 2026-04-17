import { useRouter } from '@tanstack/react-router'
import { type MouseEvent, useState } from 'react'

import { APCreditMemoModals } from '@/features/create-pages/ap-credit-memo-create/components/ap-credit-memo-modals'
import { APCreditMemoProductSection } from '@/features/create-pages/ap-credit-memo-create/components/ap-credit-memo-product-section'
import { useAPCreditMemoCreate } from '@/features/create-pages/ap-credit-memo-create/hooks/use-ap-credit-memo-create'
import { AP_CREDIT_MEMO_FIELD_LABEL_TEXT } from '@/features/create-pages/ap-credit-memo-create/utils/ap-credit-memo-create.utils'
import { AddressGrid } from '@/features/create-pages/create-shared/components/grids/address-grid'
import { DocumentDatesGrid } from '@/features/create-pages/create-shared/components/grids/document-dates-grid'
import { LogisticsGrid } from '@/features/create-pages/create-shared/components/grids/logistics-grid'
import { ReferenceGrid } from '@/features/create-pages/create-shared/components/grids/reference-grid'
import { VendorCustomerGrid } from '@/features/create-pages/create-shared/components/grids/vendor-customer-grid'
import {
  CopyFromDropdown,
  type SourceDocType,
} from '@/features/create-pages/create-shared/components/layout/copy-from-dropdown'
import { CreatePageWrapper } from '@/features/create-pages/create-shared/components/layout/create-page-wrapper'
import { CopyFromDialog } from '@/features/create-pages/create-shared/components/modals/copy-from-dialog'
import {
  parseISODate,
  toDisplayDate,
  toISODate,
} from '@/features/create-pages/create-shared/utils/create-order.utils'

interface APCreditMemoCreateProps {
  mode?: 'create' | 'edit'
  docNum?: string
  sourceDocNum?: string | undefined
  sourceDocType?: 'APInvoice' | undefined
}

type CopyFromSourceType = 'APInvoice'

export function APCreditMemoCreate({
  mode = 'create',
  docNum,
  sourceDocNum,
  sourceDocType,
}: APCreditMemoCreateProps) {
  const router = useRouter()
  const [copyFromDialogOpen, setCopyFromDialogOpen] = useState(false)
  const [copyFromSourceType, setCopyFromSourceType] = useState<CopyFromSourceType | null>(null)

  const state = useAPCreditMemoCreate({
    mode,
    docNum: docNum || '',
    sourceDocNum,
    sourceDocType,
    onCreateSuccess: () => {
      router.navigate({ to: '/purchase/create-ap-credit-memo', search: {}, replace: true })
    },
  })

  const isFormHydrating =
    (mode === 'edit' && !!docNum && !state.isEditHydrated) || state.isSourceHydrating

  const handleRestrictedClick =
    (fieldName: string, forceLock = false) =>
    (event: MouseEvent<HTMLDivElement> | undefined) => {
      const isLocked = forceLock ? state.isEditMode : state.isClosed
      if (isLocked) {
        event?.preventDefault()
        event?.stopPropagation()
        state.showEditRestrictedToast(fieldName)
      }
    }

  const handleCopyFromSelect = (selected: Array<{ docNum: string; docType: SourceDocType }>) => {
    if (selected.length === 0) return
    const docNums = selected.map((s) => s.docNum).join(',')
    const docType = selected[0]!.docType as 'APInvoice'
    window.location.href = `/purchase/create-ap-credit-memo?sourceDocNum=${encodeURIComponent(docNums)}&sourceDocType=${docType}`
  }

  return (
    <CreatePageWrapper
      rootLabel="Purchase"
      breadcrumbParent={{
        label: 'A/P Credit Memo',
        to: '/purchase/ap-credit-memo',
      }}
      pageTitle={state.isEditMode ? `Update A/P Credit Memo ${docNum}` : 'Create A/P Credit Memo'}
      editError={state.createError}
      topActions={
        !state.isEditMode ? (
          <CopyFromDropdown
            vendorCode={state.vendorCodeInput}
            vendorName={state.vendorNameInput}
            sourceDocTypes={['APInvoice']}
            onSelectSource={(sourceType) => {
              setCopyFromSourceType(sourceType as CopyFromSourceType)
              setCopyFromDialogOpen(true)
            }}
          />
        ) : null
      }
    >
      <CopyFromDialog
        open={copyFromDialogOpen}
        onClose={() => {
          setCopyFromDialogOpen(false)
          setCopyFromSourceType(null)
        }}
        sourceDocType={copyFromSourceType ?? 'APInvoice'}
        vendorCode={state.vendorCodeInput}
        vendorName={state.vendorNameInput}
        onSelectDocuments={handleCopyFromSelect}
      />
      <div className="grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
        <div
          onClickCapture={handleRestrictedClick?.('Vendor Info', true)}
          className={`h-full ${state.isEditMode ? 'cursor-not-allowed' : ''}`}
        >
          <div className={`h-full ${state.isEditMode ? 'pointer-events-none' : ''}`}>
            <VendorCustomerGrid
              loading={isFormHydrating}
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
              uniformReadOnlyAppearance={state.isEditMode}
            />
          </div>
        </div>

        <div
          onClickCapture={handleRestrictedClick?.('Warehouse & Logistics', true)}
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
              onSelectSalesEmployee={state.selectSalesEmployee}
              salesEmployeeLabel="BUYER"
              salesEmployeePlaceholder="Select Buyer"
              salesEmployeeDisabled={state.isEditMode}
              uniformReadOnlyAppearance={state.isEditMode}
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
          docDueDateReadOnly={state.isEditMode}
          uniformReadOnlyAppearance={state.isEditMode}
        />
      </div>

      <div className="mt-3 grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
        <div
          className={`h-full lg:col-span-2 ${state.isEditMode ? 'cursor-not-allowed' : ''}`}
          onClickCapture={handleRestrictedClick?.('Address', true)}
        >
          <div className={`h-full ${state.isEditMode ? 'pointer-events-none' : ''}`}>
            <AddressGrid
              className="h-full"
              loading={isFormHydrating}
              billToAddress={state.billToAddress}
              shipToAddress={state.shipToAddress}
              readOnly={state.isEditMode}
              uniformReadOnlyAppearance={state.isEditMode}
              onBillToAddressChange={state.setBillToAddress}
              onShipToAddressChange={state.setShipToAddress}
            />
          </div>
        </div>

        <ReferenceGrid
          loading={isFormHydrating}
          referenceNo={state.referenceNo}
          comments={state.remarks}
          referenceNoDisabled={false}
          uniformReadOnlyAppearance={state.isEditMode}
          onReferenceNoDisabledClick={() => state.setReferenceNo(state.referenceNo)}
          onReferenceNoChange={state.setReferenceNo}
          onCommentsChange={state.setRemarks}
          commentsDisabled={false}
          onCommentsDisabledClick={() => state.setRemarks(state.remarks)}
        />
      </div>

      <APCreditMemoProductSection
        rows={state.rows}
        productRowDrafts={state.productRowDrafts}
        createError={state.createError}
        createDisabledReason={state.createDisabledReason}
        missingSearchMandatoryFields={state.missingSearchMandatoryFields}
        searchRequiredCompletionPercent={state.searchRequiredCompletionPercent}
        searchMandatoryFields={state.searchMandatoryFields}
        missingMandatoryFields={state.missingMandatoryFields}
        requiredCompletionPercent={state.requiredCompletionPercent}
        requiredFieldsTotal={state.requiredFieldsTotal}
        requiredFieldLabelText={AP_CREDIT_MEMO_FIELD_LABEL_TEXT}
        openProductPopup={state.openProductPopup}
        prefetchProducts={state.prefetchProducts}
        isSubmitting={
          state.isEditMode ? state.updateMutation.isPending : state.createMutation.isPending
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
        isClosed={state.isClosed}
      />

      <APCreditMemoModals state={state} />

      {state.pendingVendorChange && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30">
          <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-lg">
            <h3 className="mb-2 text-sm font-semibold text-zinc-900">Confirm Vendor Change</h3>
            <p className="mb-4 text-sm text-zinc-600">
              Changing vendor will affect copied document data. Continue?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={state.cancelVendorChange}
                className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                No
              </button>
              <button
                type="button"
                onClick={state.confirmVendorChange}
                className="rounded-full border border-blue-600 bg-blue-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </CreatePageWrapper>
  )
}

export default APCreditMemoCreate
