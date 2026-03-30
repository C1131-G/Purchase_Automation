import { type ReactNode } from 'react'
import { BaseProductSection } from '@/features/create-pages/create-shared/components/sections/base-product-section'
import { CreateProductTable } from '@/features/create-pages/create-shared/components/tables/create-product-table'
import { AP_INVOICE_MANDATORY_FIELDS } from '@/features/create-pages/create-shared/config/create-mandatory-fields'

interface APInvoiceProductSectionProps {
  state: any
  secondaryActions?: ReactNode
  submitLabel?: string
  submitLoadingText?: string
}

export function APInvoiceProductSection({
  state,
  secondaryActions,
  submitLabel = 'Create',
  submitLoadingText = 'Creating...',
}: APInvoiceProductSectionProps) {
  return (
    <BaseProductSection
      title="Invoiced Items"
      onSearchProducts={() => state.openProductPopup(null)}
      onPrefetchProducts={state.prefetchProducts}
      totals={state.totals}
      backToUrl="/purchase/ap-invoice"
      isSubmitting={state.isSubmitting}
      onSubmit={state.handleCreateOrder}
      disabledReason={state.createError}
      secondaryActions={secondaryActions}
      missingMandatoryFields={state.missingMandatoryFields}
      mandatoryCompletionPercent={state.requiredCompletionPercent}
      mandatoryFieldsTotal={AP_INVOICE_MANDATORY_FIELDS.length}
      requiredFieldLabels={state.requiredFieldLabelText}
      submitLabel={submitLabel}
      submitLoadingText={submitLoadingText}
      isEditMode={state.isEditMode}
      isReadOnly={state.isEditMode}
      hideSearch={state.isEditMode}
    >
      <CreateProductTable
        productRows={state.rows}
        productRowDrafts={state.productRowDrafts}
        openProductPopup={state.openProductPopup}
        updateProductRow={state.updateProductRow}
        removeProductRow={state.removeProductRow}
        setProductRowDraft={state.setProductRowDraft}
        clearProductRowDraft={state.clearProductRowDraft}
        prefetchProducts={state.prefetchProducts}
        warehouses={state.warehouses}
        warehousesLoading={state.warehousesLoading}
        disableLineInputs={state.isEditMode}
        totals={state.totals}
        summaryCurrencyLabel={null}
        createError={state.createError}
      />
    </BaseProductSection>
  )
}
