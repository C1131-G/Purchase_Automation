import type { ReactNode } from "react";

import { BaseProductSection } from "@/features/create-pages/create-shared/components/sections/base-product-section";
import { CreateProductTable } from "@/features/create-pages/create-shared/components/tables/create-product-table";
import { SALES_QUOTATION_MANDATORY_FIELDS } from "@/features/create-pages/create-shared/config/create-mandatory-fields";
import type { useSalesQuotationCreate } from "@/features/create-pages/sales-quotation-create/hooks/use-sales-quotation-create";
import { REQUIRED_FIELD_LABEL_TEXT } from "@/features/create-pages/sales-quotation-create/utils/sq-create.utils";

type SalesQuotationState = ReturnType<typeof useSalesQuotationCreate>;

interface SalesQuotationProductSectionProps {
  sectionId: string;
  submitDisabled?: boolean;
  isDirty?: boolean;
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
  onSubmitMode?: (mode: "save-new" | "view" | "close" | "draft") => void;
  isEditMode?: boolean;
  isSaved?: boolean;
  savedDocNum?: string | number | null;
  onDownload?: (type: "pdf" | "excel" | "word") => void;
  onReset?: () => void;
  setProductRows: SalesQuotationState["setProductRows"];
  vendorName: SalesQuotationState["nameInput"];
  vendorCode: SalesQuotationState["codeInput"];
  defaultWarehouseCode: SalesQuotationState["effectiveWarehouseCode"];
}

/**
 * SalesQuotationProductSection: Management of Sales Quotation line items, totals, and submission.
 * Leverages the shared BaseProductSection for a consistent ERP UI.
 */
export function SalesQuotationProductSection({
  sectionId,
  submitDisabled,
  isDirty,
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
  onSubmitMode,
  isEditMode = false,
  isSaved = false,
  savedDocNum = null,
  onDownload,
  onReset,
  setProductRows,
  vendorName,
  vendorCode,
  defaultWarehouseCode,
}: SalesQuotationProductSectionProps) {
  return (
    <BaseProductSection
      submitDisabled={submitDisabled}
      isDirty={isDirty}
      sectionId={sectionId}
      onSearchProducts={() => openProductPopup(null)}
      onPrefetchProducts={prefetchProducts}
      productRows={productRows}
      setProductRows={setProductRows}
      defaultWarehouseCode={defaultWarehouseCode || ""}
      vendorName={vendorName}
      vendorCode={vendorCode}
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
      onSubmitMode={onSubmitMode}
      isSaved={isSaved}
      savedDocNum={savedDocNum}
      onDownload={onDownload}
      onReset={onReset}
      disabledReason={createDisabledReason}
      missingMandatoryFields={missingMandatoryFields}
      mandatoryCompletionPercent={requiredCompletionPercent}
      mandatoryFieldsTotal={SALES_QUOTATION_MANDATORY_FIELDS.length}
      isEditMode={isEditMode}
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
        showUom={true}
        showExplicitZeroDiscount={true}
      />
    </BaseProductSection>
  );
}
