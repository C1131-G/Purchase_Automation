import { useRouter } from '@tanstack/react-router'
import { type MouseEvent, useState } from 'react'

import { APInvoiceModals } from '@/features/create-pages/ap-invoice-create/components/ap-invoice-modals'
import { APInvoiceProductSection } from '@/features/create-pages/ap-invoice-create/components/ap-invoice-product-section'
import { useAPInvoiceCreate } from '@/features/create-pages/ap-invoice-create/hooks/use-ap-invoice-create'
import { AP_INVOICE_FIELD_LABEL_TEXT } from '@/features/create-pages/ap-invoice-create/utils/ap-invoice-create.utils'
import { AddressGrid } from '@/features/create-pages/create-shared/components/grids/address-grid'
import { DocumentDatesGrid } from '@/features/create-pages/create-shared/components/grids/document-dates-grid'
import { LogisticsGrid } from '@/features/create-pages/create-shared/components/grids/logistics-grid'
import { ReferenceGrid } from '@/features/create-pages/create-shared/components/grids/reference-grid'
import { VendorCustomerGrid } from '@/features/create-pages/create-shared/components/grids/vendor-customer-grid'
import { CopyFromDropdown } from '@/features/create-pages/create-shared/components/layout/copy-from-dropdown'
import { CopyToDropdown } from '@/features/create-pages/create-shared/components/layout/copy-to-dropdown'
import { CreatePageWrapper } from '@/features/create-pages/create-shared/components/layout/create-page-wrapper'
import { CopyFromDialog } from '@/features/create-pages/create-shared/components/modals/copy-from-dialog'
import {
  parseISODate,
  toDisplayDate,
  toISODate,
} from '@/features/create-pages/create-shared/utils/create-order.utils'

interface APInvoiceCreateProps {
  mode?: 'create' | 'edit'
  docNum?: string
  sourceDocNum?: string | undefined
  sourceDocType?: 'PurchaseOrder' | 'GoodsReceiptPO' | undefined
}

export function APInvoiceCreate({
  mode = 'create',
  docNum,
  sourceDocNum,
  sourceDocType,
}: APInvoiceCreateProps) {
  const router = useRouter()
  const state = useAPInvoiceCreate({
    mode,
    docNum: docNum || '',
    sourceDocNum,
    sourceDocType,
    onCreateSuccess: () => {
      router.navigate({ to: '/purchase/ap-invoice', replace: true })
    },
  })

  const [copyFromDialogOpen, setCopyFromDialogOpen] = useState(false)

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

  const handleCopyFromSelect = (
    selected: Array<{ docNum: string; docType: 'PurchaseOrder' | 'GoodsReceiptPO' | 'APInvoice' }>,
  ) => {
    if (selected.length === 0) return
    // Navigate to create page with first selected document
    // Multi-document merge would require backend support
    const first = selected[0]!
    window.location.href = `/purchase/create-ap-invoice?sourceDocNum=${first.docNum}&sourceDocType=${first.docType}`
  }

  return (
    <CreatePageWrapper
      rootLabel="Purchase"
      breadcrumbParent={{
        label: 'A/P Invoice',
        to: '/purchase/ap-invoice',
      }}
      pageTitle={state.isEditMode ? `Update A/P Invoice ${docNum}` : 'Create A/P Invoice'}
      editError={state.createError}
      topActions={
        !state.isEditMode ? (
          <CopyFromDropdown
            vendorCode={state.vendorCodeInput}
            vendorName={state.vendorNameInput}
            onClick={() => setCopyFromDialogOpen(true)}
          />
        ) : null
      }
    >
      <CopyFromDialog
        open={copyFromDialogOpen}
        onClose={() => setCopyFromDialogOpen(false)}
        sourceDocTypes={['PurchaseOrder', 'GoodsReceiptPO']}
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
              onBillToAddressChange={state.setBillToAddress}
              onShipToAddressChange={state.setShipToAddress}
            />
          </div>
        </div>

        <ReferenceGrid
          loading={isFormHydrating}
          referenceNo={state.referenceNo}
          comments={state.remarks}
          referenceNoDisabled={state.isClosed}
          onReferenceNoDisabledClick={() => state.setReferenceNo(state.referenceNo)}
          onReferenceNoChange={state.setReferenceNo}
          onCommentsChange={state.setRemarks}
          commentsDisabled={state.isClosed}
          onCommentsDisabledClick={() => state.setRemarks(state.remarks)}
        />
      </div>

      <APInvoiceProductSection
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
        requiredFieldLabelText={AP_INVOICE_FIELD_LABEL_TEXT}
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
        secondaryActions={
          state.isEditMode && !state.isClosed ? (
            <CopyToDropdown
              docNum={docNum!}
              sourceDocType="APInvoice"
              targets={['AP Credit Note']}
            />
          ) : null
        }
      />

      <APInvoiceModals state={state} />
    </CreatePageWrapper>
  )
}

export default APInvoiceCreate
