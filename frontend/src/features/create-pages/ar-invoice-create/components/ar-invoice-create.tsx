import { ChevronDown, FileText, ClipboardList } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import { goeyToast } from 'goey-toast'
import { type MouseEvent, useState, useRef, useEffect } from 'react'

import { ARInvoiceProductSection } from '@/features/create-pages/ar-invoice-create/components/ar-invoice-product-section'
import { PullFromSOModal } from '@/features/create-pages/ar-invoice-create/components/pull-from-so-modal'
import { PullFromSQModal } from '@/features/create-pages/ar-invoice-create/components/pull-from-sq-modal'
import { useARInvoiceCreate } from '@/features/create-pages/ar-invoice-create/hooks/use-ar-invoice-create'
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
import { arInvoiceQueries } from '@/features/table-pages/ar-invoices/api/ar-invoice.queries'

interface ARInvoiceCreateProps {
  mode?: 'create' | 'edit'
  docNum?: string
}

/**
 * ARInvoiceCreate: Orchestrator for the complex A/R Invoice creation flow.
 * State is managed by useARInvoiceCreate for a clean, declarative UI.
 * Leverages CreatePageWrapper for consistent entity layout.
 */
export function ARInvoiceCreate({ mode = 'create', docNum }: ARInvoiceCreateProps) {
  const queryClient = useQueryClient()
  const search = useSearch({ strict: false })
  const sourceDocNum = mode === 'create' ? search.sourceDocNum : undefined
  const sourceDocType =
    mode === 'create'
      ? search.sourceDocType === 'SalesQuotation' || search.sourceDocType === 'SalesOrder'
        ? search.sourceDocType
        : undefined
      : undefined

  const state = useARInvoiceCreate(
    docNum
      ? { mode, docNum }
      : {
          mode,
          ...(sourceDocNum ? { sourceDocNum } : {}),
          ...(sourceDocType ? { sourceDocType } : {}),
        },
  )

  const [copyFromOpen, setCopyFromOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setCopyFromOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside as any)
    return () => document.removeEventListener('mousedown', handleClickOutside as any)
  }, [])

  const pageTitle = state.isEditMode ? 'Update A/R Invoice' : 'Create A/R Invoice'
  const isFormHydrating = !state.isEditMode
    ? state.vendorsQuery.isLoading &&
      state.warehousesQuery.isLoading &&
      state.salesEmployeesQuery.isLoading &&
      !state.vendorsQuery.data
    : (state.editDetailQuery.isLoading && !state.editDetailQuery.data) || !state.isEditHydrated

  const handleCustomerRestrictedClick = state.isEditMode
    ? (event: MouseEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
        state.showEditRestrictedToast('Customer Info')
      }
    : undefined

  return (
    <div
      onClickCapture={() => goeyToast.dismiss()}
      onKeyDownCapture={() => goeyToast.dismiss()}
      className="contents"
    >
      <CreatePageWrapper
        rootLabel="Sales"
        breadcrumbParent={{
          label: 'A/R Invoice Data Table',
          to: '/sales/ar-invoice',
          onMouseEnter: () =>
            void queryClient.prefetchQuery(arInvoiceQueries.list({ page: 1, limit: 10 })),
        }}
        pageTitle={pageTitle}
        editError={
          state.isEditMode && state.editDetailQuery.isError
            ? state.editDetailQuery.error instanceof Error
              ? state.editDetailQuery.error.message
              : 'Unable to load A/R invoice for editing.'
            : null
        }
      >
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900">{pageTitle}</h1>
          {!state.isEditMode && (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setCopyFromOpen(!copyFromOpen)}
                disabled={!state.codeInput.trim()}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-blue-200 active:scale-95 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none disabled:cursor-not-allowed group"
              >
                <span>Copy from</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${copyFromOpen ? 'rotate-180' : ''}`} />
              </button>

              {copyFromOpen && (
                <div className="absolute right-0 top-full z-[60] mt-2 w-56 origin-top-right overflow-hidden rounded-2xl border border-zinc-100 bg-white p-1.5 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in duration-150">
                   <button
                    onClick={() => {
                      state.setPullFromSOModalOpen(true)
                      setCopyFromOpen(false)
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 hover:text-blue-600"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <FileText className="h-4.5 w-4.5" />
                    </div>
                    <span>Sales Orders</span>
                  </button>
                  <button
                    onClick={() => {
                      state.setPullFromSQModalOpen(true)
                      setCopyFromOpen(false)
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 hover:text-orange-600"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                      <ClipboardList className="h-4.5 w-4.5" />
                    </div>
                    <span>Sales Quotations</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
          <div
            onClickCapture={handleCustomerRestrictedClick}
            className={`h-full ${state.isEditMode ? 'cursor-not-allowed' : ''}`}
          >
            <div className={`h-full ${state.isEditMode ? 'pointer-events-none' : ''}`}>
              <VendorCustomerGrid
                loading={state.vendorsQuery.isLoading || isFormHydrating}
                error={
                  state.vendorsQuery.isError
                    ? state.vendorsQuery.error instanceof Error
                      ? state.vendorsQuery.error.message
                      : 'Unable to load customers.'
                    : null
                }
                sectionTitle="Customer Info"
                nameLabel="Customer Name *"
                codeLabel="Customer Code *"
                namePlaceholder="Select or Type Customer"
                codePlaceholder="Select or Type Code"
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

          <LogisticsGrid
            salesEmployeeLabel="Sales Employee"
            salesEmployeeInput={state.salesEmployeeInput}
            salesEmployeesLoading={state.salesEmployeesQuery.isLoading || isFormHydrating}
            error={state.salesEmployeesQuery.isError ? 'Unable to load sales employees.' : null}
            salesEmployeeFocused={state.salesEmployeeFocused}
            salesEmployeeSuggestions={state.salesEmployeeSuggestions}
            onSalesEmployeeChange={state.handleSalesEmployeeChange}
            onSalesEmployeeFocus={() => state.setSalesEmployeeFocused(true)}
            onSalesEmployeeBlur={() => setTimeout(() => state.setSalesEmployeeFocused(false), 120)}
            onOpenSalesEmployeePopup={() => state.openPopup('sales-employee')}
            onSelectSalesEmployee={state.selectSalesEmployee}
            salesEmployeeDisabled={state.isEditMode}
          />

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
            onSetActiveDatePicker={state.setActiveDatePicker}
            onDocDateChange={state.setDocDate}
            onDocDueDateChange={state.setDocDueDate}
            docDateReadOnly={state.isEditMode}
          />
        </div>

        <div className="mt-3 grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
          <AddressGrid
            loading={isFormHydrating}
            billToAddress={state.billToAddress}
            shipToAddress={state.shipToAddress}
            readOnly={state.isEditMode}
            onBillToAddressChange={state.setBillToAddress}
            onShipToAddressChange={state.setShipToAddress}
          />
          <ReferenceGrid
            loading={isFormHydrating}
            referenceNo={state.header.referenceNo}
            comments={state.header.comments}
            referenceNoDisabled={state.isEditMode}
            onReferenceNoChange={(value) => state.setHeader({ referenceNo: value })}
            onCommentsChange={(value) => state.setHeader({ comments: value })}
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
          submitLabel={state.isEditMode ? 'Update' : 'Create'}
          submitLoadingText={state.isEditMode ? 'Updating...' : 'Creating...'}
          onEditRestrictedClick={state.showEditRestrictedToast}
          warehouses={state.warehouses}
          warehousesLoading={state.warehousesQuery.isLoading || isFormHydrating}
        />
        <SharedCreateModals
          state={state}
          entityLabels={{
            vendorPopupTitle: 'Search Customers',
            vendorErrorMsg: 'Unable to load customers',
          }}
        />

        {!state.isEditMode && (
          <>
            <PullFromSOModal
              open={state.pullFromSOModalOpen}
              onClose={() => state.setPullFromSOModalOpen(false)}
              cardCode={state.codeInput}
              onConfirm={state.addProductsFromSOs}
            />
            <PullFromSQModal
              open={state.pullFromSQModalOpen}
              onClose={() => state.setPullFromSQModalOpen(false)}
              cardCode={state.codeInput}
              onConfirm={state.addProductsFromSQs}
            />
          </>
        )}
      </CreatePageWrapper>
    </div>
  )
}
