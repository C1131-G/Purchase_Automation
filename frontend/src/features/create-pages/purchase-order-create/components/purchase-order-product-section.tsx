import { type ReactNode } from 'react'
import { BaseProductSection } from '@/features/create-pages/create-shared/components/sections/base-product-section'
import { CreateProductTable } from '@/features/create-pages/create-shared/components/tables/create-product-table'
import { PURCHASE_ORDER_MANDATORY_FIELDS } from '@/features/create-pages/create-shared/config/create-mandatory-fields'
import { type usePurchaseOrderCreate } from '@/features/create-pages/purchase-order-create/hooks/use-purchase-order-create'
import { REQUIRED_FIELD_LABEL_TEXT } from '@/features/create-pages/purchase-order-create/utils/po-create.utils'

type PurchaseOrderState = ReturnType<typeof usePurchaseOrderCreate>

interface PurchaseOrderProductSectionProps {
  sectionId: string
  missingSearchMandatoryFields: PurchaseOrderState['missingSearchMandatoryFields']
  searchRequiredCompletionPercent: PurchaseOrderState['searchRequiredCompletionPercent']
  searchMandatoryFields: PurchaseOrderState['searchMandatoryFields']
  openProductPopup: PurchaseOrderState['openProductPopup']
  prefetchProducts: PurchaseOrderState['prefetchProducts']
  productRows: PurchaseOrderState['productRows']
  productRowDrafts: PurchaseOrderState['productRowDrafts']
  updateProductRow: PurchaseOrderState['updateProductRow']
  removeProductRow: PurchaseOrderState['removeProductRow']
  setProductRowDraft: PurchaseOrderState['setProductRowDraft']
  clearProductRowDraft: PurchaseOrderState['clearProductRowDraft']
  totals: PurchaseOrderState['totals']
  summaryCurrencyLabel: PurchaseOrderState['summaryCurrencyLabel']
  createError: PurchaseOrderState['createError']
  createDisabledReason: PurchaseOrderState['createDisabledReason']
  createPurchaseOrderMutation: PurchaseOrderState['createPurchaseOrderMutation']
  warehouses: PurchaseOrderState['warehouses']
  warehousesLoading: PurchaseOrderState['warehousesQuery']['isLoading']
  missingMandatoryFields: PurchaseOrderState['missingMandatoryFields']
  requiredCompletionPercent: PurchaseOrderState['requiredCompletionPercent']
  handleCreateOrder: PurchaseOrderState['handleCreateOrder']
  submitLabel?: string
  submitLoadingText?: string
  secondaryActions?: ReactNode
  isEditMode: boolean
  isClosed: boolean
}

/**
 * PurchaseOrderProductSection: Manages the line items and calculations for POs.
 * Leverages the shared BaseProductSection for a consistent ERP UI.
 */
export function PurchaseOrderProductSection({
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
  createPurchaseOrderMutation,
  missingMandatoryFields,
  requiredCompletionPercent,
  warehouses,
  warehousesLoading,
  handleCreateOrder,
  submitLabel = 'Create',
  submitLoadingText = 'Creating...',
  secondaryActions,
  isEditMode,
  isClosed,
}: PurchaseOrderProductSectionProps) {
  return (
    <BaseProductSection
      sectionId={sectionId}
      onSearchProducts={() => openProductPopup(null)}
      onPrefetchProducts={prefetchProducts}
      missingSearchFields={missingSearchMandatoryFields}
      searchCompletionPercent={searchRequiredCompletionPercent}
      searchFieldsTotal={searchMandatoryFields.length}
      requiredFieldLabels={REQUIRED_FIELD_LABEL_TEXT}
      totals={totals}
      currencyLabel={summaryCurrencyLabel}
      createError={createError}
      backToUrl="/purchase/orders"
      submitLabel={submitLabel}
      submitLoadingText={submitLoadingText}
      isSubmitting={createPurchaseOrderMutation.isPending}
      onSubmit={handleCreateOrder}
      disabledReason={createDisabledReason}
      secondaryActions={secondaryActions}
      missingMandatoryFields={missingMandatoryFields}
      mandatoryCompletionPercent={requiredCompletionPercent}
      mandatoryFieldsTotal={PURCHASE_ORDER_MANDATORY_FIELDS.length}
      hideSearch={isClosed}
      isEditMode={isEditMode}
      isReadOnly={isClosed}
    >
      <CreateProductTable
        productRows={productRows}
        productRowDrafts={productRowDrafts}
        enforceStockLimit={false}
        openProductPopup={openProductPopup}
        updateProductRow={updateProductRow}
        removeProductRow={removeProductRow}
        setProductRowDraft={setProductRowDraft}
        clearProductRowDraft={clearProductRowDraft}
        prefetchProducts={prefetchProducts}
        totals={totals}
        summaryCurrencyLabel={summaryCurrencyLabel}
        createError={createError}
        warehouses={warehouses}
        warehousesLoading={warehousesLoading}
        disableLineInputs={isClosed}
        showExplicitZeroDiscount={true}
      />
    </BaseProductSection>
  )
}
