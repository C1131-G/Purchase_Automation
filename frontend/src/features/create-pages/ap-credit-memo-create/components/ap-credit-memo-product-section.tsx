import type { ReactNode } from "react";

import type { APCreditMemoCreateLine } from "@/features/create-pages/ap-credit-memo-create/hooks/use-ap-credit-memo-create";
import { BaseProductSection } from "@/features/create-pages/create-shared/components/sections/base-product-section";
import { CreateProductTable } from "@/features/create-pages/create-shared/components/tables/create-product-table";
import {
  calculateOrderTotals,
  calculateSummaryCurrency,
} from "@/features/create-pages/create-shared/utils/create-order.calculations";
import type { CreateLookupOption } from "@/features/create-pages/create-shared/utils/create-order.types";

interface APCreditMemoProductSectionProps {
  rows: APCreditMemoCreateLine[];
  productRowDrafts: Record<
    string,
    { quantity?: string; discountPercent?: string; discountAmount?: string }
  >;
  submitDisabled?: boolean;
  isDirty?: boolean;
  createError: string | null;
  createDisabledReason: string | null;
  missingSearchMandatoryFields: string[];
  searchRequiredCompletionPercent: number;
  searchMandatoryFields: readonly string[];
  missingMandatoryFields: string[];
  requiredCompletionPercent: number;
  requiredFieldsTotal: number;
  requiredFieldLabelText: Record<string, string>;
  openProductPopup: (rowId: string | null) => void;
  prefetchProducts: () => void;
  isSubmitting: boolean;
  isEditMode: boolean;
  onUpdateProductRow: (rowId: string, patch: Partial<APCreditMemoCreateLine>) => void;
  onRemoveProductRow: (rowId: string) => void;
  onSetProductRowDraft: (
    rowId: string,
    field: keyof import("@/features/create-pages/create-shared/utils/create-order.types").ProductRowDraft,
    value: string,
  ) => void;
  onClearProductRowDraft: (
    rowId: string,
    field: keyof import("@/features/create-pages/create-shared/utils/create-order.types").ProductRowDraft,
  ) => void;
  onSubmit: () => void;
  warehouses: CreateLookupOption[];
  warehousesLoading: boolean;
  onEditRestrictedClick?: (fieldName: string) => void;
  secondaryActions?: ReactNode;
  isClosed?: boolean;
  headerDiscountPercent?: number;
  warehouseErrors?: Record<string, string>;
  onSubmitMode?: (mode: "save-new" | "view" | "close" | "draft") => void;
  isSaved?: boolean;
  savedDocNum?: string | number | null;
  onDownload?: (type: "pdf" | "excel" | "word") => void;
  onReset?: () => void;
  submitLoadingText?: string;
  setProductRows: (
    rows: APCreditMemoCreateLine[] | ((prev: APCreditMemoCreateLine[]) => APCreditMemoCreateLine[]),
  ) => void;
  vendorName: string;
  vendorCode: string;
  defaultWarehouseCode: string;
}

export function APCreditMemoProductSection({
  rows,
  productRowDrafts,
  submitDisabled,
  isDirty,
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
  isClosed = false,
  headerDiscountPercent = 0,
  warehouseErrors,
  onSubmitMode,
  isSaved = false,
  savedDocNum = null,
  onDownload,
  onReset,
  submitLoadingText,
  setProductRows,
  vendorName,
  vendorCode,
  defaultWarehouseCode,
}: APCreditMemoProductSectionProps) {
  const selectedRows = rows.filter((r) => r.selected);
  const totals = calculateOrderTotals(selectedRows, { headerDiscountPercent });
  const summaryCurrencyLabel = calculateSummaryCurrency(selectedRows) || null;

  const isReadOnlyMode = isEditMode || isClosed;

  return (
    <BaseProductSection
      submitDisabled={submitDisabled}
      isDirty={isDirty}
      sectionId="ap-credit-memo-product-section"
      onSearchProducts={() => {
        if (isReadOnlyMode) {
          onEditRestrictedClick?.("Products");
          return;
        }
        openProductPopup(null);
      }}
      onPrefetchProducts={prefetchProducts}
      productRows={rows as any}
      setProductRows={setProductRows as any}
      defaultWarehouseCode={defaultWarehouseCode || ""}
      vendorName={vendorName}
      vendorCode={vendorCode}
      missingSearchFields={missingSearchMandatoryFields}
      searchCompletionPercent={searchRequiredCompletionPercent}
      searchFieldsTotal={searchMandatoryFields.length}
      requiredFieldLabels={requiredFieldLabelText}
      totals={totals}
      currencyLabel={summaryCurrencyLabel}
      createError={createError}
      backToUrl="/purchase/ap-credit-memo"
      backToLabel="Back to Table"
      submitLabel={isEditMode ? "Update" : "Add"}
      submitLoadingText={submitLoadingText || (isEditMode ? "Updating..." : "Adding...")}
      isSubmitting={isSubmitting}
      onSubmit={onSubmit}
      onSubmitMode={onSubmitMode}
      isSaved={isSaved}
      savedDocNum={savedDocNum}
      onDownload={onDownload}
      onReset={onReset}
      disabledReason={createDisabledReason}
      missingMandatoryFields={missingMandatoryFields}
      mandatoryCompletionPercent={requiredCompletionPercent}
      mandatoryFieldsTotal={requiredFieldsTotal}
      isEditMode={isEditMode}
      isReadOnly={isReadOnlyMode}
      hideSearch={isReadOnlyMode}
      showSubmitButton={isEditMode || !isClosed}
      secondaryActions={secondaryActions}
    >
      <div
        onClickCapture={
          isReadOnlyMode
            ? (event) => {
                event.preventDefault();
                event.stopPropagation();
                onEditRestrictedClick?.("Products");
              }
            : undefined
        }
      >
        <CreateProductTable
          productRows={rows}
          productRowDrafts={productRowDrafts}
          enforceStockLimit={false}
          maxQuantity={(row) => row.baseQuantity}
          linkedRow={(row) => row.baseEntry != null && row.baseLine != null}
          disableLineInputs={isReadOnlyMode}
          onLineInputRestrictedClick={() => onEditRestrictedClick?.("Products")}
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
          showExplicitZeroDiscount={true}
          showTaxCode
          taxSide="purchase"
          lotRequired
          showSelection={true}
          showReturnReason={true}
          warehouseErrors={warehouseErrors}
          showUom={true}
        />
      </div>
    </BaseProductSection>
  );
}
