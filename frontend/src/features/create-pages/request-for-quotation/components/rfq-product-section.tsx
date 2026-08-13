import { Loader2 } from "lucide-react";

import { Button } from "@/components/button";
import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";
import { CreateProductTable } from "@/features/create-pages/create-shared/components/tables/create-product-table";
import type {
  ProductRow,
  ProductRowDraft,
} from "@/features/create-pages/create-shared/utils/create-order.types";
import type { calculateOrderTotals } from "@/features/create-pages/create-shared/utils/create-order.calculations";
import { notifyEditRestrictedField } from "@/features/create-pages/create-shared/utils/create-feedback-toast";
import type { RfqLineFieldErrors } from "@/features/create-pages/request-for-quotation/utils/rfq-form.utils";

interface RfqProductSectionProps {
  productRows: ProductRow[];
  productRowDrafts: Record<string, ProductRowDraft>;
  updateProductRow: (id: string, patch: Partial<ProductRow>) => void;
  removeProductRow: (id: string) => void;
  setProductRowDraft: (id: string, field: keyof ProductRowDraft, value: string) => void;
  clearProductRowDraft: (id: string, field: keyof ProductRowDraft) => void;
  openProductPopup: (rowId: string | null) => void;
  prefetchProducts: () => void;
  totals: ReturnType<typeof calculateOrderTotals>;
  canEdit: boolean;
  canSubmit: boolean;
  isSubmitting: boolean;
  /** API / network errors only — validation uses red field borders. */
  formError: string | null;
  lineFieldErrors: RfqLineFieldErrors;
  onSubmit: () => void;
}

/**
 * RFQ product block — same PQ line table (dates/qtys/price/disc),
 * with seller-fill field locks. Submit only (no Add / Search / Convert).
 */
export function RfqProductSection({
  productRows,
  productRowDrafts,
  updateProductRow,
  removeProductRow,
  setProductRowDraft,
  clearProductRowDraft,
  openProductPopup,
  prefetchProducts,
  totals,
  canEdit,
  canSubmit,
  isSubmitting,
  formError,
  lineFieldErrors,
  onSubmit,
}: RfqProductSectionProps) {
  const restricted = () => {
    notifyEditRestrictedField("Product line");
  };

  return (
    <SectionCard title="Product Details">
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
        summaryCurrencyLabel={null}
        createError={null}
        warehouses={[]}
        warehousesLoading={false}
        enforceStockLimit={false}
        showExplicitZeroDiscount
        showUom
        showTaxCode
        taxSide="sales"
        uoms={[]}
        showPqLineDatesAndQtys
        rfqSellerFill
        disableLineInputs={!canEdit}
        onLineInputRestrictedClick={restricted}
        lineFieldErrors={lineFieldErrors}
      />

      <div className="border-t border-linen-100 px-4 py-3">
        <div className="ml-auto w-full max-w-sm">
          <div className="space-y-1">
            <div className="flex items-center justify-end gap-3 border-b border-linen-200/80 py-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">
                Tax Total
              </span>
              <span className="min-w-20 text-right text-base font-semibold text-ink-900">
                {totals.taxTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-end gap-3 border-b border-linen-200/80 py-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">
                Net Total
              </span>
              <span className="min-w-20 text-right text-base font-semibold text-ink-900">
                {totals.netTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-end gap-3 py-1">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">
                Grand Total
              </span>
              <span className="min-w-20 text-right text-lg font-bold text-ink-900">
                {totals.grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {formError ? (
          <p className="mt-2 text-right text-xs font-medium text-red-600">{formError}</p>
        ) : null}

        {canSubmit ? (
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              size="md"
              variant="outline"
              disabled={isSubmitting || productRows.length === 0}
              onClick={onSubmit}
              className="group h-11 w-52 rounded-xl border border-linen-200 bg-surface px-4 py-2 text-sm font-semibold text-ink-900 shadow-sm transition-all hover:border-linen-200 hover:bg-linen-50 hover:text-ink-900 focus:outline-none focus:ring-0 ring-0 outline-none flex items-center justify-center gap-2 cursor-pointer normal-case tracking-normal disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
                  <span>Submitting…</span>
                </>
              ) : (
                <span>Submit</span>
              )}
            </Button>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
