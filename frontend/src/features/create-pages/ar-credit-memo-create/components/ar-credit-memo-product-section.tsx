import { useMemo } from 'react'

import { type useArCreditMemoCreate } from '@/features/create-pages/ar-credit-memo-create/hooks/use-ar-credit-memo-create'
import { REQUIRED_FIELD_LABEL_TEXT } from '@/features/create-pages/ar-credit-memo-create/utils/ar-credit-memo-create.utils'
import { BaseProductSection } from '@/features/create-pages/create-shared/components/sections/base-product-section'
import { CreateProductTable } from '@/features/create-pages/create-shared/components/tables/create-product-table'
import { SALES_ORDER_MANDATORY_FIELDS } from '@/features/create-pages/create-shared/config/create-mandatory-fields'

type ArCreditMemoState = ReturnType<typeof useArCreditMemoCreate>

interface ArCreditMemoProductSectionProps {
  sectionId: string
  missingSearchMandatoryFields: ArCreditMemoState['missingSearchMandatoryFields']
  searchRequiredCompletionPercent: ArCreditMemoState['searchRequiredCompletionPercent']
  searchMandatoryFields: ArCreditMemoState['searchMandatoryFields']
  openProductPopup: ArCreditMemoState['openProductPopup']
  prefetchProducts: ArCreditMemoState['prefetchProducts']
  productRows: ArCreditMemoState['productRows']
  productRowDrafts: ArCreditMemoState['productRowDrafts']
  updateProductRow: ArCreditMemoState['updateProductRow']
  removeProductRow: ArCreditMemoState['removeProductRow']
  setProductRowDraft: ArCreditMemoState['setProductRowDraft']
  clearProductRowDraft: ArCreditMemoState['clearProductRowDraft']
  totals: ArCreditMemoState['totals']
  summaryCurrencyLabel: ArCreditMemoState['summaryCurrencyLabel']
  createError: ArCreditMemoState['createError']
  createDisabledReason: ArCreditMemoState['createDisabledReason']
  createArCreditMemoMutation: ArCreditMemoState['createArCreditMemoMutation']
  missingMandatoryFields: ArCreditMemoState['missingMandatoryFields']
  requiredCompletionPercent: ArCreditMemoState['requiredCompletionPercent']
  handleCreateOrder: ArCreditMemoState['handleCreateOrder']
  submitLabel?: string
  submitLoadingText?: string
  onEditRestrictedClick?: (fieldName: string) => void
  warehouses: ArCreditMemoState['warehouses']
  warehousesLoading: boolean
}

/**
 * ArCreditMemoProductSection: Management of AR Credit Memo line items, totals, and submission.
 * Leverages the shared BaseProductSection for consistent UI patterns across ERP modules.
 */
export function ArCreditMemoProductSection({
  sectionId,
  missingSearchMandatoryFields,
  searchRequiredCompletionPercent,
  searchMandatoryFields,
  openProductPopup,
  prefetchProducts,
  productRows,
  productRowDrafts,
  updateProductRow,
  removeProductRow,
  setProductRowDraft,
  clearProductRowDraft,
  totals,
  summaryCurrencyLabel,
  createError,
  createDisabledReason,
  createArCreditMemoMutation,
  missingMandatoryFields,
  requiredCompletionPercent,
  handleCreateOrder,
  submitLabel = 'Create',
  submitLoadingText = 'Creating...',
  onEditRestrictedClick,
  warehouses,
  warehousesLoading,
}: ArCreditMemoProductSectionProps) {
  const isUpdateAction = submitLabel.toLowerCase().includes('update')

  const missingSearchFieldsList = useMemo(
    () =>
      Object.entries(missingSearchMandatoryFields)
        .filter(([, v]) => Boolean(v))
        .map(([k]) => k),
    [missingSearchMandatoryFields],
  )

  const handleOpenProductPopup = (rowId: string | null) => {
    openProductPopup(rowId, '', {
      onValidateBeforeOpen: () => ({ ...missingSearchMandatoryFields }),
      onValidationFailed: () => {},
    })
  }

  return (
    <BaseProductSection
      sectionId={sectionId}
      onSearchProducts={() => {
        if (isUpdateAction) {
          onEditRestrictedClick?.('Products')
          return
        }
        openProductPopup(null, '', {
          onValidateBeforeOpen: () => ({ ...missingSearchMandatoryFields }),
          onValidationFailed: () => {},
        })
      }}
      onPrefetchProducts={prefetchProducts}
      missingSearchFields={missingSearchFieldsList}
      searchCompletionPercent={searchRequiredCompletionPercent}
      searchFieldsTotal={searchMandatoryFields.length}
      requiredFieldLabels={REQUIRED_FIELD_LABEL_TEXT}
      totals={totals}
      currencyLabel={summaryCurrencyLabel}
      createError={createError}
      backToUrl="/sales/ar-credit-memo"
      backToLabel="Back to Table"
      submitLabel={submitLabel}
      submitLoadingText={submitLoadingText}
      isSubmitting={createArCreditMemoMutation.isPending}
      onSubmit={handleCreateOrder}
      disabledReason={createDisabledReason ?? null}
      missingMandatoryFields={missingMandatoryFields}
      mandatoryCompletionPercent={requiredCompletionPercent}
      mandatoryFieldsTotal={SALES_ORDER_MANDATORY_FIELDS.length}
      isEditMode={isUpdateAction}
      showSubmitButton={!isUpdateAction}
    >
      <div
        onClickCapture={
          isUpdateAction
            ? (event) => {
                event.preventDefault()
                event.stopPropagation()
                onEditRestrictedClick?.('Products')
              }
            : undefined
        }
      >
        <CreateProductTable
          productRows={productRows}
          productRowDrafts={productRowDrafts}
          warehouses={warehouses}
          warehousesLoading={warehousesLoading}
          stockLimitReserve={0}
          minStockToSelectWarehouse={0}
          disableLineInputs={isUpdateAction}
          maxQuantity={(row) => row.baseQuantity}
          linkedRow={(row) => row.baseEntry != null && row.baseLine != null}
          onLineInputRestrictedClick={() => onEditRestrictedClick?.('Products')}
          openProductPopup={handleOpenProductPopup}
          updateProductRow={updateProductRow}
          removeProductRow={removeProductRow}
          setProductRowDraft={setProductRowDraft}
          clearProductRowDraft={clearProductRowDraft}
          prefetchProducts={prefetchProducts}
          totals={totals}
          summaryCurrencyLabel={summaryCurrencyLabel}
          createError={createError}
          showSelection={true}
          showReturnReason={true}
        />
      </div>
    </BaseProductSection>
  )
}
