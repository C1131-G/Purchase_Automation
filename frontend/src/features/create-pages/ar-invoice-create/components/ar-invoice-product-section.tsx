import type { useARInvoiceCreate } from "@/features/create-pages/ar-invoice-create/hooks/use-ar-invoice-create";
import { REQUIRED_FIELD_LABEL_TEXT } from "@/features/create-pages/ar-invoice-create/utils/ar-invoice-create.utils";
import { BaseProductSection } from "@/features/create-pages/create-shared/components/sections/base-product-section";
import { CreateProductTable } from "@/features/create-pages/create-shared/components/tables/create-product-table";
import { AR_INVOICE_MANDATORY_FIELDS } from "@/features/create-pages/create-shared/config/create-mandatory-fields";

type ARInvoiceState = ReturnType<typeof useARInvoiceCreate>;

interface ARInvoiceProductSectionProps {
  sectionId: string;
  submitDisabled?: boolean;
  missingSearchMandatoryFields: ARInvoiceState["missingSearchMandatoryFields"];
  searchRequiredCompletionPercent: ARInvoiceState["searchRequiredCompletionPercent"];
  searchMandatoryFields: ARInvoiceState["searchMandatoryFields"];
  openProductPopup: ARInvoiceState["openProductPopup"];
  prefetchProducts: ARInvoiceState["prefetchProducts"];
  productRows: ARInvoiceState["productRows"];
  productRowDrafts: ARInvoiceState["productRowDrafts"];
  updateProductRow: ARInvoiceState["updateProductRow"];
  removeProductRow: ARInvoiceState["removeProductRow"];
  setProductRowDraft: ARInvoiceState["setProductRowDraft"];
  clearProductRowDraft: ARInvoiceState["clearProductRowDraft"];
  totals: ARInvoiceState["totals"];
  summaryCurrencyLabel: ARInvoiceState["summaryCurrencyLabel"];
  createError: ARInvoiceState["createError"];
  createDisabledReason: ARInvoiceState["createDisabledReason"];
  createARInvoiceMutation: ARInvoiceState["createARInvoiceMutation"];
  missingMandatoryFields: ARInvoiceState["missingMandatoryFields"];
  requiredCompletionPercent: ARInvoiceState["requiredCompletionPercent"];
  handleCreateOrder: ARInvoiceState["handleCreateOrder"];
  submitLabel?: string;
  submitLoadingText?: string;
  onEditRestrictedClick?: (fieldName: string) => void;
  warehouses: ARInvoiceState["warehouses"];
  warehousesLoading: boolean;
  secondaryActions?: React.ReactNode;
  onSubmitMode?: (mode: "save-new" | "view" | "close" | "draft") => void;
  isSaved?: boolean;
  savedDocNum?: string | number | null;
  onDownload?: (type: "pdf" | "excel" | "word") => void;
  onReset?: () => void;
  setProductRows: ARInvoiceState["setProductRows"];
  vendorName: ARInvoiceState["nameInput"];
  vendorCode: ARInvoiceState["codeInput"];
  defaultWarehouseCode: ARInvoiceState["effectiveWarehouseCode"];
}

/**
 * ARInvoiceProductSection: Management of AR Invoice line items, totals, and submission.
 * Leverages the shared BaseProductSection for consistent UI patterns across ERP modules.
 */
export function ARInvoiceProductSection({
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
  createARInvoiceMutation,
  missingMandatoryFields,
  requiredCompletionPercent,
  handleCreateOrder,
  submitLabel = "Create",
  submitLoadingText = "Creating...",
  onEditRestrictedClick,
  warehouses,
  warehousesLoading,
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
}: ARInvoiceProductSectionProps) {
  const isUpdateAction = submitLabel.toLowerCase().includes("update");

  return (
    <BaseProductSection
      submitDisabled={submitDisabled}
      sectionId={sectionId}
      onSearchProducts={() => {
        if (isUpdateAction) {
          onEditRestrictedClick?.("Products");
          return;
        }
        openProductPopup(null);
      }}
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
      backToUrl="/sales/ar-invoice"
      backToLabel="Back to Table"
      submitLabel={submitLabel}
      submitLoadingText={submitLoadingText}
      isSubmitting={createARInvoiceMutation.isPending}
      onSubmit={handleCreateOrder}
      onSubmitMode={onSubmitMode}
      isSaved={isSaved}
      savedDocNum={savedDocNum}
      onDownload={onDownload}
      onReset={onReset}
      disabledReason={createDisabledReason}
      missingMandatoryFields={missingMandatoryFields}
      mandatoryCompletionPercent={requiredCompletionPercent}
      mandatoryFieldsTotal={AR_INVOICE_MANDATORY_FIELDS.length}
      isEditMode={isUpdateAction}
      showSubmitButton={true}
      secondaryActions={secondaryActions}
    >
      <div
        onClickCapture={
          isUpdateAction
            ? (event) => {
                event.preventDefault();
                event.stopPropagation();
                onEditRestrictedClick?.("Products");
              }
            : undefined
        }
      >
        <CreateProductTable
          productRows={productRows}
          productRowDrafts={productRowDrafts}
          warehouses={warehouses}
          warehousesLoading={warehousesLoading}
          stockLimitReserve={1}
          minStockToSelectWarehouse={2}
          disableLineInputs={isUpdateAction}
          onLineInputRestrictedClick={() => onEditRestrictedClick?.("Products")}
          openProductPopup={openProductPopup}
          updateProductRow={updateProductRow}
          removeProductRow={removeProductRow}
          setProductRowDraft={setProductRowDraft}
          clearProductRowDraft={clearProductRowDraft}
          prefetchProducts={prefetchProducts}
          totals={totals}
          summaryCurrencyLabel={summaryCurrencyLabel}
          createError={createError}
        />
      </div>
    </BaseProductSection>
  );
}
