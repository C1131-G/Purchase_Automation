import { type MouseEvent } from 'react'
import { goeyToast } from 'goey-toast'

import { AddressGrid } from '@/features/create-pages/create-shared/components/grids/address-grid'
import { DocumentDatesGrid } from '@/features/create-pages/create-shared/components/grids/document-dates-grid'
import { LogisticsGrid } from '@/features/create-pages/create-shared/components/grids/logistics-grid'
import { ReferenceGrid } from '@/features/create-pages/create-shared/components/grids/reference-grid'
import { VendorCustomerGrid } from '@/features/create-pages/create-shared/components/grids/vendor-customer-grid'
import { CreatePageWrapper } from '@/features/create-pages/create-shared/components/layout/create-page-wrapper'
import { APInvoiceProductSection } from '@/features/create-pages/ap-invoice-create/components/ap-invoice-product-section'
import { useAPInvoiceCreate } from '@/features/create-pages/ap-invoice-create/hooks/use-ap-invoice-create'
import {
  parseISODate,
  toDisplayDate,
  toISODate,
} from '@/features/create-pages/create-shared/utils/create-order.utils'

interface APInvoiceCreateProps {
  mode?: 'create' | 'edit'
  docNum?: string
  sourceDocNum?: string | undefined
  sourceDocType?: 'GoodsReceiptPO' | undefined
}

/**
 * APInvoiceCreate: Main orchestrator for creating and editing AP Invoices.
 * Handles document-level data, line items, and submission logic.
 */
export function APInvoiceCreate({
  mode = 'create',
  docNum,
  sourceDocNum,
  sourceDocType,
}: APInvoiceCreateProps) {

  const state = useAPInvoiceCreate({
    mode,
    docNum,
    sourceDocNum: sourceDocNum as string | undefined,
    sourceDocType: sourceDocType as any,
  })

  const handleRestrictedClick =
    (fieldName: string) => (event: MouseEvent<HTMLDivElement> | undefined) => {
      if (state.isEditMode) {
        event?.preventDefault()
        event?.stopPropagation()
        goeyToast.error(`Editing ${fieldName} is not allowed in Edit mode.`)
      }
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
    >
      <div className="grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
        <div
          onClickCapture={handleRestrictedClick('Vendor Info')}
          className={`h-full ${state.isEditMode ? 'cursor-not-allowed' : ''}`}
        >
          <div className={`h-full ${state.isEditMode ? 'pointer-events-none' : ''}`}>
            <VendorCustomerGrid
              loading={false}
              error={null}
              nameInput={state.vendorNameInput}
              codeInput={state.vendorCodeInput}
              nameFocused={false}
              codeFocused={false}
              nameSuggestions={state.vendorNameSuggestions}
              codeSuggestions={state.vendorCodeSuggestions}
              onNameChange={state.setVendorNameInput}
              onCodeChange={state.setVendorCodeInput}
              onNameFocus={() => {}}
              onCodeFocus={() => {}}
              onNameBlur={() => {}}
              onCodeBlur={() => {}}
              onOpenNamePopup={() => {}}
              onOpenCodePopup={() => {}}
              onSelectVendor={state.selectVendor}
              vendorNameInvalid={Boolean(state.fieldErrors.vendorName)}
              vendorCodeInvalid={Boolean(state.fieldErrors.vendorCode)}
              vendorNameErrorText={state.fieldErrors.vendorName ?? undefined}
              vendorCodeErrorText={state.fieldErrors.vendorCode ?? undefined}
              nameDisabled={state.isEditMode}
              codeDisabled={state.isEditMode}
            />
          </div>
        </div>

        <div
          onClickCapture={handleRestrictedClick('Logistics')}
          className={`h-full ${state.isEditMode ? 'cursor-not-allowed' : ''}`}
        >
          <div className={`h-full ${state.isEditMode ? 'pointer-events-none' : ''}`}>
            <LogisticsGrid
              salesEmployeeInput={state.buyerInput}
              salesEmployeesLoading={false}
              salesEmployeeFocused={false}
              salesEmployeeSuggestions={state.buyerSuggestions}
              onSalesEmployeeChange={state.setBuyerInput}
              onSalesEmployeeFocus={() => {}}
              onSalesEmployeeBlur={() => {}}
              onOpenSalesEmployeePopup={() => {}}
              onSelectSalesEmployee={state.selectBuyer}
              salesEmployeeDisabled={state.isEditMode}
            />
          </div>
        </div>

        <DocumentDatesGrid
          docDate={state.header.docDate}
          docDueDate={state.header.docDueDate}
          today={new Date()}
          activeDatePicker={state.activeDatePicker as any}
          docDateContainerRef={state.docDateContainerRef}
          deliveryDateContainerRef={state.deliveryDateContainerRef}
          onSetActiveDatePicker={state.setActiveDatePicker as any}
          onDocDateChange={state.handleDocDateChange}
          onDocDueDateChange={state.handleDocDueDateChange}
          docDateReadOnly={state.isEditMode}
          docDueDateEditableHighlight={state.isEditMode}
          toDisplayDate={toDisplayDate}
          parseISODate={parseISODate}
          toISODate={toISODate}
        />
      </div>

      <div className="mt-3 grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
        <div
          className={`h-full lg:col-span-2 ${state.isEditMode ? 'cursor-not-allowed' : ''}`}
          onClickCapture={handleRestrictedClick('Address')}
        >
          <div className={`h-full ${state.isEditMode ? 'pointer-events-none' : ''}`}>
            <AddressGrid
              billToAddress={state.billToAddress}
              shipToAddress={state.shipToAddress}
              onBillToAddressChange={state.setBillToAddress}
              onShipToAddressChange={state.setShipToAddress}
              readOnly={state.isEditMode}
            />
          </div>
        </div>

        <div
          onClickCapture={handleRestrictedClick('Reference & Comments')}
          className={`h-full ${state.isEditMode ? 'cursor-not-allowed' : ''}`}
        >
          <div className={`h-full ${state.isEditMode ? 'pointer-events-none' : ''}`}>
            <ReferenceGrid
              loading={false}
              referenceNo={state.header.referenceNo}
              comments={state.header.remarks}
              onReferenceNoChange={state.handleReferenceNoChange}
              onCommentsChange={state.handleRemarksChange}
              referenceNoDisabled={state.isEditMode}
              commentsEditableHighlight={state.isEditMode}
              referenceNoInvalid={Boolean(state.fieldErrors.referenceNo)}
              referenceNoErrorText={state.fieldErrors.referenceNo ?? undefined}
            />
          </div>
        </div>
      </div>

      <APInvoiceProductSection
        state={state}
        submitLabel={state.isEditMode ? 'Update' : 'Create'}
        submitLoadingText={state.isEditMode ? 'Updating...' : 'Creating...'}
      />
    </CreatePageWrapper>
  )
}
