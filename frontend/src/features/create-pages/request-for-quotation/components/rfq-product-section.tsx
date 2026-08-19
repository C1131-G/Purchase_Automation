import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LayoutDashboard, Loader2, Table } from "lucide-react";

import { Button } from "@/components/button";
import { Popover } from "@/components/popover";
import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
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
  rfqQuotedDateMax?: string;
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
  rfqQuotedDateMax = "",
  onSubmit,
}: RfqProductSectionProps) {
  const navigate = useNavigate();
  const taxCodesQuery = useQuery(createSharedQueries.taxCodes());
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
        taxCodes={taxCodesQuery.data ?? []}
        taxSide="sales"
        uoms={[]}
        showPqLineDatesAndQtys
        rfqQuotedDateMax={rfqQuotedDateMax}
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

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Popover.Root>
              <Popover.Trigger asChild>
                <Button
                  type="button"
                  size="md"
                  variant="outline"
                  className="group flex h-11 w-56 cursor-pointer items-center justify-center gap-2 rounded-xl border border-linen-200 bg-surface px-4 py-2 text-sm font-semibold tracking-normal text-ink-900 shadow-sm outline-none ring-0 transition-all hover:bg-linen-50 hover:text-teal-600 focus:outline-none focus:ring-0 normal-case"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                  Go Back
                </Button>
              </Popover.Trigger>
              <Popover.Content side="top" align="start" className="z-[1001] w-56">
                <div className="flex flex-col py-1">
                  <button
                    type="button"
                    onClick={() => {
                      void navigate({ to: "/dashboard" });
                    }}
                    className="group flex w-full cursor-pointer items-start gap-3 px-3 py-2.5 text-left transition-all hover:bg-linen-50"
                  >
                    <LayoutDashboard className="mt-0.5 h-4 w-4 text-neutral-400 transition-colors group-hover:text-neutral-500" />
                    <span className="flex flex-col">
                      <span className="text-[13px] font-bold text-ink-900 transition-colors group-hover:text-ink-900">
                        Back to Dashboard
                      </span>
                      <span className="mt-0.5 text-[10px] text-neutral-400">
                        Go to main dashboard
                      </span>
                    </span>
                  </button>
                  <div className="border-t border-linen-100" />
                  <button
                    type="button"
                    onClick={() => {
                      void navigate({
                        search: { limit: 10, page: 1 },
                        to: "/sales/request-for-quotations",
                      });
                    }}
                    className="group flex w-full cursor-pointer items-start gap-3 px-3 py-2.5 text-left transition-all hover:bg-linen-50"
                  >
                    <Table className="mt-0.5 h-4 w-4 text-neutral-400 transition-colors group-hover:text-ink-900" />
                    <span className="flex flex-col">
                      <span className="text-[13px] font-bold text-ink-900 transition-colors group-hover:text-ink-900">
                        Back to Table
                      </span>
                      <span className="mt-0.5 text-[10px] text-neutral-400">
                        Go to document table
                      </span>
                    </span>
                  </button>
                </div>
              </Popover.Content>
            </Popover.Root>
          </div>

          {canSubmit ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="md"
                variant="outline"
                disabled={isSubmitting || productRows.length === 0}
                onClick={onSubmit}
                className="group flex h-11 w-52 cursor-pointer items-center justify-center gap-2 rounded-xl border border-linen-200 bg-surface px-4 py-2 text-sm font-semibold tracking-normal text-ink-900 shadow-sm outline-none ring-0 transition-all hover:border-linen-200 hover:bg-linen-50 hover:text-ink-900 focus:outline-none focus:ring-0 normal-case disabled:cursor-not-allowed disabled:opacity-60"
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
      </div>
    </SectionCard>
  );
}
