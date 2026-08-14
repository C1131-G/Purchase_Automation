import type { ReactNode } from "react";

import { BaseProductSection } from "@/features/create-pages/create-shared/components/sections/base-product-section";
import { CreateProductTable } from "@/features/create-pages/create-shared/components/tables/create-product-table";
import {
  calculateOrderTotals,
  calculateSummaryCurrency,
} from "@/features/create-pages/create-shared/utils/create-order.calculations";
import type { CreateLookupOption } from "@/features/create-pages/create-shared/utils/create-order.types";
import type { ProductRow } from "@/features/create-pages/create-shared/utils/create-order.types";
import type { GRPOCreateLine } from "@/features/create-pages/grpo-create/hooks/use-grpo-create";

interface GRPOProductSectionProps {
  rows: GRPOCreateLine[];
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
  loading?: boolean;
  onUpdateProductRow: (rowId: string, patch: Partial<GRPOCreateLine>) => void;
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
  onSubmit: (action?: "save-new" | "view" | "close" | "draft") => void;
  warehouses: CreateLookupOption[];
  warehousesLoading: boolean;
  onEditRestrictedClick?: (fieldName: string) => void;
  secondaryActions?: ReactNode;
  headerDiscountPercent?: number;
  warehouseErrors?: Record<string, string>;
  onOpenLotPage?: (row: ProductRow) => void;
  onSubmitMode?: (mode: "save-new" | "view" | "close" | "draft") => void;
  isSaved?: boolean;
  savedDocNum?: string | number | null;
  onDownload?: (type: "pdf" | "excel" | "word") => void;
  onReset?: () => void;
  submitLoadingText?: string;
  setProductRows: (rows: GRPOCreateLine[] | ((prev: GRPOCreateLine[]) => GRPOCreateLine[])) => void;
  vendorName: string;
  vendorCode: string;
  defaultWarehouseCode: string;
}

/**
 * GRPOProductSection: Management of GRPO line items, totals, and submission.
 * Inherits shared UI patterns via BaseProductSection.
 */
export function GRPOProductSection({
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
  loading = false,
  onUpdateProductRow,
  onRemoveProductRow,
  onSetProductRowDraft,
  onClearProductRowDraft,
  onSubmit,
  warehouses,
  warehousesLoading,
  onEditRestrictedClick,
  secondaryActions,
  headerDiscountPercent = 0,
  warehouseErrors,
  onOpenLotPage,
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
}: GRPOProductSectionProps) {
  const totals = calculateOrderTotals(rows, { headerDiscountPercent });
  const summaryCurrencyLabel = calculateSummaryCurrency(rows) || null;

  return (
    <BaseProductSection
      submitDisabled={submitDisabled}
      sectionId="grpo-product-section"
      onSearchProducts={() => {
        if (isEditMode) {
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
      loading={loading}
      totals={totals}
      currencyLabel={summaryCurrencyLabel}
      createError={createError}
      backToUrl="/purchase/grpo"
      backToLabel="Back to Table"
      submitLabel={isEditMode ? "Update" : "Add"}
      submitLoadingText={submitLoadingText || (isEditMode ? "Updating..." : "Adding...")}
      isSubmitting={isSubmitting}
      onSubmit={onSubmit}
      disabledReason={createDisabledReason}
      missingMandatoryFields={missingMandatoryFields}
      mandatoryCompletionPercent={requiredCompletionPercent}
      mandatoryFieldsTotal={requiredFieldsTotal}
      isEditMode={isEditMode}
      isReadOnly={isEditMode}
      hideSearch={isEditMode}
      secondaryActions={secondaryActions}
      onSubmitMode={onSubmitMode}
      isSaved={isSaved}
      isDirty={isDirty}
      savedDocNum={savedDocNum}
      onDownload={onDownload}
      onReset={onReset}
    >
      <div
        onClickCapture={
          isEditMode
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
          linkedRow={(row) => !!row.baseEntry && !!row.baseLine}
          disableLineInputs={isEditMode}
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
          lotRequired={!isEditMode}
          {...(!isEditMode && onOpenLotPage ? { onOpenLotPage } : {})}
          warehouseErrors={warehouseErrors}
          showUom={true}
        />
      </div>
    </BaseProductSection>
  );
}
