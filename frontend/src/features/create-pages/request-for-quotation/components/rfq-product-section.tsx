import { Button } from "@/components/button";
import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";
import { CreateProductTable } from "@/features/create-pages/create-shared/components/tables/create-product-table";
import type {
  ProductRow,
  ProductRowDraft,
} from "@/features/create-pages/create-shared/utils/create-order.types";
import type { calculateOrderTotals } from "@/features/create-pages/create-shared/utils/create-order.calculations";
import { notifyEditRestrictedField } from "@/features/create-pages/create-shared/utils/create-feedback-toast";

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
  formError: string | null;
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
        createError={formError}
        warehouses={[]}
        warehousesLoading={false}
        enforceStockLimit={false}
        showTaxCode={false}
        showExplicitZeroDiscount
        showUom
        uoms={[]}
        showPqLineDatesAndQtys
        rfqSellerFill
        disableLineInputs={!canEdit}
        onLineInputRestrictedClick={restricted}
      />

      <div className="mt-3 flex flex-col items-end gap-2 border-t border-zinc-100 px-2 pt-3">
        <div className="flex w-full max-w-sm flex-col gap-1">
          <div className="flex items-center justify-end gap-3 border-b border-zinc-200/80 py-1">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
              Tax Total
            </span>
            <span className="min-w-20 text-right text-base font-semibold text-zinc-800">
              {totals.taxTotal.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-end gap-3 border-b border-zinc-200/80 py-1">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
              Net Total
            </span>
            <span className="min-w-20 text-right text-base font-semibold text-zinc-800">
              {totals.netTotal.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-end gap-3 py-1">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-600">
              Grand Total
            </span>
            <span className="min-w-20 text-right text-lg font-bold text-zinc-900">
              {totals.grandTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {formError ? (
          <p className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </p>
        ) : null}

        {canSubmit ? (
          <div className="flex w-full flex-wrap items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              disabled={isSubmitting || productRows.length === 0}
              onClick={onSubmit}
            >
              {isSubmitting ? "Submitting…" : "Submit"}
            </Button>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
