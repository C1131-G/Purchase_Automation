import type { ReactNode } from "react";

import { BaseProductSection } from "@/features/create-pages/create-shared/components/sections/base-product-section";
import { CreateProductTable } from "@/features/create-pages/create-shared/components/tables/create-product-table";
import { PURCHASE_QUOTATION_MANDATORY_FIELDS } from "@/features/create-pages/create-shared/config/create-mandatory-fields";
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
  uoms: PurchaseQuotationState["uoms"];
  missingMandatoryFields: PurchaseQuotationState["missingMandatoryFields"];
  requiredCompletionPercent: PurchaseQuotationState["requiredCompletionPercent"];
  handleCreateOrder: PurchaseQuotationState["handleCreateOrder"];
  submitLabel?: string;
  submitLoadingText?: string;
  secondaryActions?: ReactNode;
  isEditMode: boolean;
  isClosed: boolean;
  allowSearchInEditMode?: boolean;
  warehouseErrors: PurchaseQuotationState["warehouseErrors"];
  onSubmitMode?: (mode: "save-new" | "view" | "close" | "draft") => void;
  isSaved?: boolean;
  savedDocNum?: string | number | null;
  onDownload?: (type: "pdf" | "excel" | "word") => void;
  onReset?: () => void;
  setProductRows: PurchaseQuotationState["setProductRows"];
  vendorName: PurchaseQuotationState["nameInput"];
  vendorCode: PurchaseQuotationState["codeInput"];
  defaultWarehouseCode: PurchaseQuotationState["effectiveWarehouseCode"];
  submitDisabled?: boolean;
  isDirty?: boolean;
  isSubmitting?: boolean;
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
  uoms,
  handleCreateOrder,
  submitLabel = "Add",
  submitLoadingText = "Creating...",
  secondaryActions,
  isEditMode,
  isClosed,
  allowSearchInEditMode = false,
  warehouseErrors,
  onSubmitMode,
  isSaved = false,
  savedDocNum = null,
  onDownload,
  onReset,
  setProductRows,
  vendorName,
  vendorCode,
  defaultWarehouseCode,
  submitDisabled,
  isDirty,
  isSubmitting,
}: PurchaseQuotationProductSectionProps) {
  return (
    <BaseProductSection
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
      backToUrl="/purchase/quotations"
      backToLabel="Back to Table"
      submitLabel={submitLabel}
      submitLoadingText={submitLoadingText}
      secondaryActions={secondaryActions}
      isSubmitting={isSubmitting ?? createPurchaseQuotationMutation.isPending}
      onSubmit={handleCreateOrder}
      onSubmitMode={onSubmitMode}
      isSaved={isSaved}
      isDirty={isDirty}
      savedDocNum={savedDocNum}
      onDownload={onDownload}
      onReset={onReset}
      // PQ: Save & New / View / Close disabled (Save & Draft remains).
      disabledSaveModes={["save-new", "view", "close"]}
      disabledReason={createDisabledReason}
      missingMandatoryFields={missingMandatoryFields}
      mandatoryCompletionPercent={requiredCompletionPercent}
      mandatoryFieldsTotal={PURCHASE_QUOTATION_MANDATORY_FIELDS.length}
      hideSearch={isClosed}
      isEditMode={isEditMode}
      isReadOnly={isClosed}
      allowSearchInEditMode={allowSearchInEditMode}
      submitDisabled={submitDisabled}
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
        enforceStockLimit={false}
        showExplicitZeroDiscount={true}
        disableLineInputs={isClosed}
        warehouseErrors={warehouseErrors}
        showUom={true}
        uoms={uoms}
        showPqLineDatesAndQtys
      />
    </BaseProductSection>
  );
}
