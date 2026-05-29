import type { ReactNode } from "react";

import { BaseProductSection } from "@/features/create-pages/create-shared/components/sections/base-product-section";
import { CreateProductTable } from "@/features/create-pages/create-shared/components/tables/create-product-table";
import { SALES_QUOTATION_MANDATORY_FIELDS } from "@/features/create-pages/create-shared/config/create-mandatory-fields";
import type { usePurchaseQuotationCreate } from "@/features/create-pages/purchase-quotation-create/hooks/use-purchase-quotation-create";
import { REQUIRED_FIELD_LABEL_TEXT } from "@/features/create-pages/purchase-quotation-create/utils/pq-create.utils";

type PurchaseQuotationState = ReturnType<typeof usePurchaseQuotationCreate>;

interface PurchaseQuotationProductSectionProps {
  sectionId: string;
  missingSearchMandatoryFields: PurchaseQuotationState["missingSearchMandatoryFields"];
  searchRequiredCompletionPercent: PurchaseQuotationState["searchRequiredCompletionPercent"];
  searchMandatoryFields: PurchaseQuotationState["searchMandatoryFields"];
  openProductPopup: PurchaseQuotationState["openProductPopup"];
  prefetchProducts: PurchaseQuotationState["prefetchProducts"];
  productRows: PurchaseQuotationState["productRows"];
  productRowDrafts: PurchaseQuotationState["productRowDrafts"];
  updateProductRow: PurchaseQuotationState["updateProductRow"];
  removeProductRow: PurchaseQuotationState["removeProductRow"];
  setProductRowDraft: PurchaseQuotationState["setProductRowDraft"];
  clearProductRowDraft: PurchaseQuotationState["clearProductRowDraft"];
  totals: PurchaseQuotationState["totals"];
  summaryCurrencyLabel: PurchaseQuotationState["summaryCurrencyLabel"];
  createError: PurchaseQuotationState["createError"];
  createDisabledReason: PurchaseQuotationState["createDisabledReason"];
  createPurchaseQuotationMutation: PurchaseQuotationState["createPurchaseQuotationMutation"];
  warehouses: PurchaseQuotationState["warehouses"];
  warehousesLoading: PurchaseQuotationState["warehousesQuery"]["isLoading"];
  missingMandatoryFields: PurchaseQuotationState["missingMandatoryFields"];
  requiredCompletionPercent: PurchaseQuotationState["requiredCompletionPercent"];
  handleCreateOrder: PurchaseQuotationState["handleCreateOrder"];
  submitLabel?: string;
  submitLoadingText?: string;
  secondaryActions?: ReactNode;
}

/**
 * PurchaseQuotationProductSection: Management of Purchase Quotation line items, totals, and submission.
 * Leverages the shared BaseProductSection for a consistent ERP UI.
 */
export function PurchaseQuotationProductSection({
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
  createPurchaseQuotationMutation,
  missingMandatoryFields,
  requiredCompletionPercent,
  warehouses,
  warehousesLoading,
  handleCreateOrder,
  submitLabel = "Create",
  submitLoadingText = "Creating...",
  secondaryActions,
}: PurchaseQuotationProductSectionProps) {
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
      backToUrl="/purchase/quotations"
      backToLabel="Back to Table"
      submitLabel={submitLabel}
      submitLoadingText={submitLoadingText}
      secondaryActions={secondaryActions}
      isSubmitting={createPurchaseQuotationMutation.isPending}
      onSubmit={handleCreateOrder}
      disabledReason={createDisabledReason}
      missingMandatoryFields={missingMandatoryFields}
      mandatoryCompletionPercent={requiredCompletionPercent}
      mandatoryFieldsTotal={SALES_QUOTATION_MANDATORY_FIELDS.length}
    >
      <CreateProductTable
        productRows={productRows}
        productRowDrafts={productRowDrafts}
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
        stockLimitReserve={1}
        minStockToSelectWarehouse={2}
        showTaxCode={true}
      />
    </BaseProductSection>
  );
}


