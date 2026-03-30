import { type ReactNode } from 'react'
import { BaseProductSection } from '@/features/create-pages/create-shared/components/sections/base-product-section'
import { CreateProductTable } from '@/features/create-pages/create-shared/components/tables/create-product-table'
import {
  calculateOrderTotals,
  calculateSummaryCurrency,
} from '@/features/create-pages/create-shared/utils/create-order.calculations'
import { type GRPOCreateLine } from '@/features/create-pages/grpo-create/hooks/use-grpo-create'

interface GRPOProductSectionProps {
  rows: GRPOCreateLine[]
  productRowDrafts: Record<
    string,
    { quantity?: string; discountPercent?: string; discountAmount?: string }
  >
  createError: string | null
  createDisabledReason: string | null
  missingSearchMandatoryFields: string[]
  searchRequiredCompletionPercent: number
  searchMandatoryFields: readonly string[]
  missingMandatoryFields: string[]
  requiredCompletionPercent: number
  requiredFieldsTotal: number
  requiredFieldLabelText: Record<string, string>
  openProductPopup: (rowId: string | null) => void
  prefetchProducts: () => void
  isSubmitting: boolean
  isEditMode: boolean
  onUpdateProductRow: (rowId: string, patch: Partial<GRPOCreateLine>) => void
  onRemoveProductRow: (rowId: string) => void
  onSetProductRowDraft: (
    rowId: string,
    field: 'quantity' | 'discountPercent' | 'discountAmount',
    value: string,
  ) => void
  onClearProductRowDraft: (
    rowId: string,
    field: 'quantity' | 'discountPercent' | 'discountAmount',
  ) => void
  onSubmit: () => void
  warehouses: any[]
  warehousesLoading: boolean
  onEditRestrictedClick?: (fieldName: string) => void
  secondaryActions?: ReactNode
}

/**
 * GRPOProductSection: Management of GRPO line items, totals, and submission.
 * Inherits shared UI patterns via BaseProductSection.
 */
export function GRPOProductSection({
  rows,
  productRowDrafts,
  createError,
  createDisabledReason,
  missingSearchMandatoryFields,
  searchRequiredCompletionPercent,
  searchMandatoryFields,
  missingMandatoryFields,
  requiredCompletionPercent,
  requiredFieldsTotal,
  requiredFieldLabelText,
  openProductPopup,
  prefetchProducts,
  isSubmitting,
  isEditMode,
  onUpdateProductRow,
  onRemoveProductRow,
  onSetProductRowDraft,
  onClearProductRowDraft,
  onSubmit,
  warehouses,
  warehousesLoading,
  onEditRestrictedClick,
  secondaryActions,
}: GRPOProductSectionProps) {
  const totals = calculateOrderTotals(rows)
  const summaryCurrencyLabel = calculateSummaryCurrency(rows) || null

  return (
    <BaseProductSection
      sectionId="grpo-product-section"
      onSearchProducts={() => {
        if (isEditMode) {
          onEditRestrictedClick?.('Products')
          return
        }
        openProductPopup(null)
      }}
      onPrefetchProducts={prefetchProducts}
      missingSearchFields={missingSearchMandatoryFields}
      searchCompletionPercent={searchRequiredCompletionPercent}
      searchFieldsTotal={searchMandatoryFields.length}
      requiredFieldLabels={requiredFieldLabelText}
      totals={totals}
      currencyLabel={summaryCurrencyLabel}
      createError={createError}
      backToUrl="/purchase/grpo"
      backToLabel="Back to Table"
      submitLabel={isEditMode ? 'Update' : 'Create'}
      submitLoadingText={isEditMode ? 'Updating...' : 'Creating...'}
      isSubmitting={isSubmitting}
      onSubmit={onSubmit}
      disabledReason={createDisabledReason}
      missingMandatoryFields={missingMandatoryFields}
      mandatoryCompletionPercent={requiredCompletionPercent}
      mandatoryFieldsTotal={requiredFieldsTotal}
      isEditMode={isEditMode}
      secondaryActions={secondaryActions}
    >
      <div
        onClickCapture={
          isEditMode
            ? (event) => {
                event.preventDefault()
                event.stopPropagation()
                onEditRestrictedClick?.('Products')
              }
            : undefined
        }
      >
        <CreateProductTable
          productRows={rows}
          productRowDrafts={productRowDrafts}
          enforceStockLimit={false}
          disableLineInputs={isEditMode}
          onLineInputRestrictedClick={() => onEditRestrictedClick?.('Products')}
          openProductPopup={openProductPopup}
          updateProductRow={onUpdateProductRow}
          removeProductRow={onRemoveProductRow}
          setProductRowDraft={onSetProductRowDraft}
          clearProductRowDraft={onClearProductRowDraft}
          prefetchProducts={prefetchProducts}
          totals={totals}
          summaryCurrencyLabel={summaryCurrencyLabel}
          createError={createError}
          warehouses={warehouses}
          warehousesLoading={warehousesLoading}
        />
      </div>
    </BaseProductSection>
  )
}
