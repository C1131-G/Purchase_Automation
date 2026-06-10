import type { ReactNode } from "react";

import { BaseProductSection } from "@/features/create-pages/create-shared/components/sections/base-product-section";
import { CreateProductTable } from "@/features/create-pages/create-shared/components/tables/create-product-table";
import { SALES_ORDER_MANDATORY_FIELDS } from "@/features/create-pages/create-shared/config/create-mandatory-fields";
import type { useSalesOrderCreate } from "@/features/create-pages/sales-order-create/hooks/use-sales-order-create";
import { REQUIRED_FIELD_LABEL_TEXT } from "@/features/create-pages/sales-order-create/utils/so-create.utils";

type SalesOrderState = ReturnType<typeof useSalesOrderCreate>;

interface SalesOrderProductSectionProps {
  sectionId: string;
  submitDisabled?: boolean;
  missingSearchMandatoryFields: SalesOrderState["missingSearchMandatoryFields"];
  searchRequiredCompletionPercent: SalesOrderState["searchRequiredCompletionPercent"];
  searchMandatoryFields: SalesOrderState["searchMandatoryFields"];
  openProductPopup: SalesOrderState["openProductPopup"];
  prefetchProducts: SalesOrderState["prefetchProducts"];
  productRows: SalesOrderState["productRows"];
  productRowDrafts: SalesOrderState["productRowDrafts"];
  updateProductRow: SalesOrderState["updateProductRow"];
  removeProductRow: SalesOrderState["removeProductRow"];
  setProductRowDraft: SalesOrderState["setProductRowDraft"];
  clearProductRowDraft: SalesOrderState["clearProductRowDraft"];
  totals: SalesOrderState["totals"];
  summaryCurrencyLabel: SalesOrderState["summaryCurrencyLabel"];
  createError: SalesOrderState["createError"];
  createDisabledReason: SalesOrderState["createDisabledReason"];
  createSalesOrderMutation: SalesOrderState["createSalesOrderMutation"];
  warehouses: SalesOrderState["warehouses"];
  warehousesLoading: SalesOrderState["warehousesQuery"]["isLoading"];
  missingMandatoryFields: SalesOrderState["missingMandatoryFields"];
  requiredCompletionPercent: SalesOrderState["requiredCompletionPercent"];
  handleCreateOrder: SalesOrderState["handleCreateOrder"];
  submitLabel?: string;
  submitLoadingText?: string;
  secondaryActions?: ReactNode;
  onSubmitMode?: (mode: "save-new" | "view" | "close" | "draft") => void;
  isSaved?: boolean;
  savedDocNum?: string | number | null;
  onDownload?: (type: "pdf" | "excel" | "word") => void;
  onReset?: () => void;
  setProductRows: SalesOrderState["setProductRows"];
  vendorName: SalesOrderState["nameInput"];
  vendorCode: SalesOrderState["codeInput"];
  defaultWarehouseCode: SalesOrderState["effectiveWarehouseCode"];
}

/**
 * SalesOrderProductSection: Management of Sales Order line items, totals, and submission.
 * Leverages the shared BaseProductSection for a consistent ERP UI.
 */
export function SalesOrderProductSection({
  sectionId,
  submitDisabled,
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
  createSalesOrderMutation,
  missingMandatoryFields,
  requiredCompletionPercent,
  warehouses,
  warehousesLoading,
  handleCreateOrder,
  submitLabel = "Create",
  submitLoadingText = "Creating...",
  secondaryActions,
  onSubmitMode,
  isSaved = false,
  savedDocNum = null,
  onDownload,
  onReset,
  setProductRows,
  vendorName,
  vendorCode,
  defaultWarehouseCode,
}: SalesOrderProductSectionProps) {
  return (
    <BaseProductSection
      submitDisabled={submitDisabled}
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
      backToUrl="/sales/orders"
      backToLabel="Back to Table"
      submitLabel={submitLabel}
      submitLoadingText={submitLoadingText}
      secondaryActions={secondaryActions}
      isSubmitting={createSalesOrderMutation.isPending}
      onSubmit={handleCreateOrder}
      onSubmitMode={onSubmitMode}
      isSaved={isSaved}
      savedDocNum={savedDocNum}
      onDownload={onDownload}
      onReset={onReset}
      disabledReason={createDisabledReason}
      missingMandatoryFields={missingMandatoryFields}
      mandatoryCompletionPercent={requiredCompletionPercent}
      mandatoryFieldsTotal={SALES_ORDER_MANDATORY_FIELDS.length}
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
      />
    </BaseProductSection>
  );
}
