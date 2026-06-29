import { useMemo } from "react";

import type { useArCreditMemoCreate } from "@/features/create-pages/ar-credit-memo-create/hooks/use-ar-credit-memo-create";
import {
  AR_CREDIT_MEMO_MANDATORY_FIELDS,
  REQUIRED_FIELD_LABEL_TEXT,
} from "@/features/create-pages/ar-credit-memo-create/utils/ar-credit-memo-create.utils";
import { BaseProductSection } from "@/features/create-pages/create-shared/components/sections/base-product-section";
import { CreateProductTable } from "@/features/create-pages/create-shared/components/tables/create-product-table";

type ArCreditMemoState = ReturnType<typeof useArCreditMemoCreate>;

interface ArCreditMemoProductSectionProps {
  sectionId: string;
  submitDisabled?: boolean;
  isDirty?: boolean;
  missingSearchMandatoryFields: ArCreditMemoState["missingSearchMandatoryFields"];
  searchRequiredCompletionPercent: ArCreditMemoState["searchRequiredCompletionPercent"];
  searchMandatoryFields: ArCreditMemoState["searchMandatoryFields"];
  openProductPopup: ArCreditMemoState["openProductPopup"];
  prefetchProducts: ArCreditMemoState["prefetchProducts"];
  productRows: ArCreditMemoState["productRows"];
  productRowDrafts: ArCreditMemoState["productRowDrafts"];
  updateProductRow: ArCreditMemoState["updateProductRow"];
  removeProductRow: ArCreditMemoState["removeProductRow"];
  setProductRowDraft: ArCreditMemoState["setProductRowDraft"];
  clearProductRowDraft: ArCreditMemoState["clearProductRowDraft"];
  totals: ArCreditMemoState["totals"];
  summaryCurrencyLabel: ArCreditMemoState["summaryCurrencyLabel"];
  createError: ArCreditMemoState["createError"];
  createDisabledReason: ArCreditMemoState["createDisabledReason"];
  createArCreditMemoMutation: ArCreditMemoState["createArCreditMemoMutation"];
  isSubmittingState: boolean;
  missingMandatoryFields: ArCreditMemoState["missingMandatoryFields"];
  requiredCompletionPercent: ArCreditMemoState["requiredCompletionPercent"];
  handleCreateOrder: ArCreditMemoState["handleCreateOrder"];
  submitLabel?: string;
  submitLoadingText?: string;
  onEditRestrictedClick?: (fieldName: string) => void;
  warehouses: ArCreditMemoState["warehouses"];
  warehousesLoading: boolean;
  onSubmitMode?: (mode: "save-new" | "view" | "close" | "draft") => void;
  isSaved?: boolean;
  savedDocNum?: string | number | null;
  onDownload?: (type: "pdf" | "excel" | "word") => void;
  onReset?: () => void;
  setProductRows: ArCreditMemoState["setProductRows"];
  vendorName: ArCreditMemoState["nameInput"];
  vendorCode: ArCreditMemoState["codeInput"];
  defaultWarehouseCode: ArCreditMemoState["effectiveWarehouseCode"];
}

/**
 * ArCreditMemoProductSection: Management of AR Credit Memo line items, totals, and submission.
 * Leverages the shared BaseProductSection for consistent UI patterns across ERP modules.
 */
export function ArCreditMemoProductSection({
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
  createArCreditMemoMutation: _createArCreditMemoMutation,
  isSubmittingState,
  missingMandatoryFields,
  requiredCompletionPercent,
  handleCreateOrder,
  submitLabel = "Create",
  submitLoadingText = "Creating...",
  onEditRestrictedClick,
  warehouses,
  warehousesLoading,
  onSubmitMode,
  isSaved = false,
  savedDocNum = null,
  onDownload,
  onReset,
  setProductRows,
  vendorName,
  vendorCode,
  defaultWarehouseCode,
}: ArCreditMemoProductSectionProps) {
  const isUpdateAction = submitLabel.toLowerCase().includes("update");

  const missingSearchFieldsList = useMemo(
    () =>
      Object.entries(missingSearchMandatoryFields)
        .filter(([, v]) => Boolean(v))
        .map(([k]) => k),
    [missingSearchMandatoryFields],
  );

  const handleOpenProductPopup = (rowId: string | null) => {
    openProductPopup(rowId, "", {
      onValidateBeforeOpen: () => ({ ...missingSearchMandatoryFields }),
      onValidationFailed: () => {},
    });
  };

  return (
    <BaseProductSection
      submitDisabled={submitDisabled}
      isDirty={isDirty}
      sectionId={sectionId}
      onSearchProducts={() => {
        if (isUpdateAction) {
          onEditRestrictedClick?.("Products");
          return;
        }
        openProductPopup(null, "", {
          onValidateBeforeOpen: () => ({ ...missingSearchMandatoryFields }),
          onValidationFailed: () => {},
        });
      }}
      onPrefetchProducts={prefetchProducts}
      productRows={productRows}
      setProductRows={setProductRows}
      defaultWarehouseCode={defaultWarehouseCode || ""}
      vendorName={vendorName}
      vendorCode={vendorCode}
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
      isSubmitting={isSubmittingState}
      onSubmit={handleCreateOrder}
      onSubmitMode={onSubmitMode}
      isSaved={isSaved}
      savedDocNum={savedDocNum}
      onDownload={onDownload}
      onReset={onReset}
      disabledReason={createDisabledReason ?? null}
      missingMandatoryFields={missingMandatoryFields}
      mandatoryCompletionPercent={requiredCompletionPercent}
      mandatoryFieldsTotal={AR_CREDIT_MEMO_MANDATORY_FIELDS.length}
      isEditMode={isUpdateAction}
      showSubmitButton={true}
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
          stockLimitReserve={0}
          minStockToSelectWarehouse={0}
          disableLineInputs={isUpdateAction}
          maxQuantity={(row) => row.baseQuantity}
          linkedRow={(row) => row.baseEntry != null && row.baseLine != null}
          onLineInputRestrictedClick={() => onEditRestrictedClick?.("Products")}
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
          nativeReturnReason={true}
          showUom={true}
          showExplicitZeroDiscount={true}
        />
      </div>
    </BaseProductSection>
  );
}
