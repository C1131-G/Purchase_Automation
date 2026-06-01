import type { ReactNode } from "react";

import type { APInvoiceCreateLine } from "@/features/create-pages/ap-invoice-create/hooks/use-ap-invoice-create";
import { BaseProductSection } from "@/features/create-pages/create-shared/components/sections/base-product-section";
import { CreateProductTable } from "@/features/create-pages/create-shared/components/tables/create-product-table";
import {
  calculateOrderTotals,
  calculateSummaryCurrency,
} from "@/features/create-pages/create-shared/utils/create-order.calculations";
import type { CreateLookupOption } from "@/features/create-pages/create-shared/utils/create-order.types";

interface APInvoiceProductSectionProps {
  rows: APInvoiceCreateLine[];
  productRowDrafts: Record<
    string,
    { quantity?: string; discountPercent?: string; discountAmount?: string }
  >;
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
  onUpdateProductRow: (rowId: string, patch: Partial<APInvoiceCreateLine>) => void;
  onRemoveProductRow: (rowId: string) => void;
  onSetProductRowDraft: (
    rowId: string,
    field: "quantity" | "discountPercent" | "discountAmount",
    value: string,
  ) => void;
  onClearProductRowDraft: (
    rowId: string,
    field: "quantity" | "discountPercent" | "discountAmount",
  ) => void;
  onSubmit: () => void;
  warehouses: CreateLookupOption[];
  warehousesLoading: boolean;
  onEditRestrictedClick?: (fieldName: string) => void;
  secondaryActions?: ReactNode;
  isClosed?: boolean;
  headerDiscountPercent?: number;
  warehouseErrors?: Record<string, string>;
}

/**
 * APInvoiceProductSection: Management of AP Invoice line items, totals, and submission.
 * Inherits shared UI patterns via BaseProductSection.
 */
export function APInvoiceProductSection({
  rows,
  productRowDrafts,
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
}: APInvoiceProductSectionProps) {
  const totals = calculateOrderTotals(rows, { headerDiscountPercent });
  const summaryCurrencyLabel = calculateSummaryCurrency(rows) || null;

  const isReadOnlyMode = isEditMode || isClosed;

  return (
    <BaseProductSection
      sectionId="ap-invoice-product-section"
      onSearchProducts={() => {
        if (isReadOnlyMode) {
          onEditRestrictedClick?.("Products");
          return;
        }
        openProductPopup(null);
      }}
      onPrefetchProducts={prefetchProducts}
      missingSearchFields={missingSearchMandatoryFields}
      searchCompletionPercent={searchRequiredCompletionPercent}
      searchFieldsTotal={searchMandatoryFields.length}
      requiredFieldLabels={requiredFieldLabelText}
      totals={totals}
      currencyLabel={summaryCurrencyLabel}
      createError={createError}
      backToUrl="/purchase/ap-invoice"
      backToLabel="Back to Table"
      submitLabel={isEditMode ? "Update" : "Create"}
      submitLoadingText={isEditMode ? "Updating..." : "Creating..."}
      isSubmitting={isSubmitting}
      onSubmit={onSubmit}
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
          linkedRow={(row) => !!row.baseEntry && !!row.baseLine}
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
          warehouseErrors={warehouseErrors}
        />
      </div>
    </BaseProductSection>
  );
}
