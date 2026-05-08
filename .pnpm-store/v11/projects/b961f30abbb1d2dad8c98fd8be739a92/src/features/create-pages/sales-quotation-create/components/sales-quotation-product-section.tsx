import type { ReactNode } from "react";

import { BaseProductSection } from "@/features/create-pages/create-shared/components/sections/base-product-section";
import { CreateProductTable } from "@/features/create-pages/create-shared/components/tables/create-product-table";
import { SALES_QUOTATION_MANDATORY_FIELDS } from "@/features/create-pages/create-shared/config/create-mandatory-fields";
import type { useSalesQuotationCreate } from "@/features/create-pages/sales-quotation-create/hooks/use-sales-quotation-create";
import { REQUIRED_FIELD_LABEL_TEXT } from "@/features/create-pages/sales-quotation-create/utils/sq-create.utils";

type SalesQuotationState = ReturnType<typeof useSalesQuotationCreate>;

interface SalesQuotationProductSectionProps {
  sectionId: string;
  missingSearchMandatoryFields: SalesQuotationState["missingSearchMandatoryFields"];
  searchRequiredCompletionPercent: SalesQuotationState["searchRequiredCompletionPercent"];
  searchMandatoryFields: SalesQuotationState["searchMandatoryFields"];
  openProductPopup: SalesQuotationState["openProductPopup"];
  prefetchProducts: SalesQuotationState["prefetchProducts"];
  productRows: SalesQuotationState["productRows"];
  productRowDrafts: SalesQuotationState["productRowDrafts"];
  updateProductRow: SalesQuotationState["updateProductRow"];
  removeProductRow: SalesQuotationState["removeProductRow"];
  setProductRowDraft: SalesQuotationState["setProductRowDraft"];
  clearProductRowDraft: SalesQuotationState["clearProductRowDraft"];
  totals: SalesQuotationState["totals"];
  summaryCurrencyLabel: SalesQuotationState["summaryCurrencyLabel"];
  createError: SalesQuotationState["createError"];
  createDisabledReason: SalesQuotationState["createDisabledReason"];
  createSalesQuotationMutation: SalesQuotationState["createSalesQuotationMutation"];
  warehouses: SalesQuotationState["warehouses"];
  warehousesLoading: SalesQuotationState["warehousesQuery"]["isLoading"];
  missingMandatoryFields: SalesQuotationState["missingMandatoryFields"];
  requiredCompletionPercent: SalesQuotationState["requiredCompletionPercent"];
  handleCreateOrder: SalesQuotationState["handleCreateOrder"];
  submitLabel?: string;
  submitLoadingText?: string;
  secondaryActions?: ReactNode;
}

/**
 * SalesQuotationProductSection: Management of Sales Quotation line items, totals, and submission.
 * Leverages the shared BaseProductSection for a consistent ERP UI.
 */
export function SalesQuotationProductSection({
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
  createSalesQuotationMutation,
  missingMandatoryFields,
  requiredCompletionPercent,
  warehouses,
  warehousesLoading,
  handleCreateOrder,
  submitLabel = "Create",
  submitLoadingText = "Creating...",
  secondaryActions,
}: SalesQuotationProductSectionProps) {
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
      backToUrl="/sales/quotations"
      backToLabel="Back to Table"
      submitLabel={submitLabel}
      submitLoadingText={submitLoadingText}
      secondaryActions={secondaryActions}
      isSubmitting={createSalesQuotationMutation.isPending}
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
