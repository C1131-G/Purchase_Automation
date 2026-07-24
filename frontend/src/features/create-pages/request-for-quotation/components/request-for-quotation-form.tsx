import { useQueryClient } from "@tanstack/react-query";
import { Lock } from "lucide-react";

import { Button } from "@/components/button";
import { FieldBlock } from "@/features/create-pages/create-shared/components/core/field-block";
import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";
import { ReferenceGrid } from "@/features/create-pages/create-shared/components/grids/reference-grid";
import { VendorCustomerGrid } from "@/features/create-pages/create-shared/components/grids/vendor-customer-grid";
import { CreatePageWrapper } from "@/features/create-pages/create-shared/components/layout/create-page-wrapper";
import { notifyEditRestrictedField } from "@/features/create-pages/create-shared/utils/create-feedback-toast";
import { RfqLinesTable } from "@/features/create-pages/request-for-quotation/components/rfq-lines-table";
import { useRequestForQuotationForm } from "@/features/create-pages/request-for-quotation/hooks/use-request-for-quotation-form";
import { rfqStatusBadgeClass } from "@/features/create-pages/request-for-quotation/utils/rfq-form.utils";
import { icRfqQueries } from "@/features/intercompany/api/intercompany.queries";
import { toSafeErrorMessage } from "@/shared/utils/error-message";

const noop = () => {};

interface RequestForQuotationFormProps {
  rfqId: number;
}

/**
 * Phase 2 RFQ fill form — layout mirrored from Purchase Quotation create.
 * Seller (target company) edits unit price / discount / delivery on DRAFT,
 * then submits. Buyer (source) converts SUBMITTED → PQ + SQ.
 */
export function RequestForQuotationForm({ rfqId }: RequestForQuotationFormProps) {
  const queryClient = useQueryClient();
  const state = useRequestForQuotationForm(rfqId);
  const header = state.header;
  const titleNumber = header?.rfqNumber ?? String(rfqId);

  const editError =
    state.detailQuery.isError && !header
      ? toSafeErrorMessage(
          state.detailQuery.error instanceof Error ? state.detailQuery.error.message : undefined,
          "Unable to load Request For Quotation.",
        )
      : null;

  const isHydrating = state.detailQuery.isLoading && !header;

  const restricted = (fieldName: string) => () => {
    notifyEditRestrictedField(fieldName);
  };

  return (
    <CreatePageWrapper
      dashboardUrl="/dashboard"
      breadcrumbParent={{
        label: "Request For Quotations",
        onMouseEnter: () => {
          void queryClient.prefetchQuery(icRfqQueries.list());
        },
        search: { limit: 10, page: 1 },
        to: "/sales/request-for-quotations",
      }}
      pageTitle={`Request For Quotation ${titleNumber}`}
      editError={editError}
    >
      {isHydrating ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-10 text-sm text-zinc-500">
          Loading Request For Quotation…
        </div>
      ) : null}

      {header ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${rfqStatusBadgeClass(String(header.status))}`}
            >
              {header.status}
            </span>
            {state.canEditLines ? (
              <span className="text-xs text-zinc-500">
                Seller fill: set unit price, discount, and delivery date, then Save or Submit.
              </span>
            ) : state.canConvert ? (
              <span className="text-xs text-zinc-500">
                Submitted — buyer can convert to Purchase Quotation.
              </span>
            ) : (
              <span className="text-xs text-zinc-500">
                This Request For Quotation is read-only.
              </span>
            )}
          </div>

          <div className="grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
            <div
              className="h-full cursor-not-allowed"
              onClickCapture={(event) => {
                event.preventDefault();
                event.stopPropagation();
                restricted("Vendor Info")();
              }}
            >
              <div className="pointer-events-none h-full">
                <VendorCustomerGrid
                  loading={false}
                  error={null}
                  sectionTitle="Vendor Info"
                  nameLabel="Vendor Name"
                  codeLabel="Vendor Code"
                  namePlaceholder="Vendor"
                  codePlaceholder="Vendor code"
                  nameInput={header.vendorCode}
                  codeInput={header.vendorCode}
                  nameFocused={false}
                  codeFocused={false}
                  nameSuggestions={[]}
                  codeSuggestions={[]}
                  onNameChange={noop}
                  onCodeChange={noop}
                  onNameFocus={noop}
                  onCodeFocus={noop}
                  onNameBlur={noop}
                  onCodeBlur={noop}
                  onOpenNamePopup={noop}
                  onOpenCodePopup={noop}
                  onSelectVendor={noop}
                  nameDisabled
                  codeDisabled
                  uniformReadOnlyAppearance
                />
              </div>
            </div>

            <SectionCard title="Document Details">
              <div className="flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    <span className="inline-flex items-center gap-1.5">
                      <span>RFQ Number</span>
                      <Lock className="h-3 w-3 text-zinc-400" aria-hidden />
                    </span>
                  </label>
                  <div className="flex h-10 items-center rounded-xl border border-blue-200 bg-blue-50 pl-3 text-sm font-semibold text-blue-700">
                    {header.rfqNumber}
                  </div>
                </div>
                <FieldBlock
                  label="Status"
                  placeholder=""
                  value={String(header.status)}
                  onChange={noop}
                  onFocus={noop}
                  onBlur={noop}
                  disabled
                  uniformReadOnlyAppearance
                />
              </div>
            </SectionCard>

            <SectionCard title="Intercompany">
              <div className="flex flex-col gap-4">
                <FieldBlock
                  label="PQ Draft No."
                  placeholder="—"
                  value={
                    header.pqDraftDocNum != null && Number.isFinite(header.pqDraftDocNum)
                      ? String(header.pqDraftDocNum)
                      : ""
                  }
                  onChange={noop}
                  onFocus={noop}
                  onBlur={noop}
                  disabled
                  uniformReadOnlyAppearance
                />
                <FieldBlock
                  label="PQ Draft Entry"
                  placeholder="—"
                  value={String(header.pqDraftDocEntry)}
                  onChange={noop}
                  onFocus={noop}
                  onBlur={noop}
                  disabled
                  uniformReadOnlyAppearance
                />
              </div>
            </SectionCard>
          </div>

          <div className="mt-3 grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
            <div className="h-full lg:col-span-2">
              <SectionCard title="Companies">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldBlock
                    label="Source (Buyer) Company Id"
                    placeholder="—"
                    value={String(header.sourceCompanyId)}
                    onChange={noop}
                    onFocus={noop}
                    onBlur={noop}
                    disabled
                    uniformReadOnlyAppearance
                  />
                  <FieldBlock
                    label="Target (Seller) Company Id"
                    placeholder="—"
                    value={String(header.targetCompanyId)}
                    onChange={noop}
                    onFocus={noop}
                    onBlur={noop}
                    disabled
                    uniformReadOnlyAppearance
                  />
                  <FieldBlock
                    label="Created By"
                    placeholder="—"
                    value={header.createdBy ?? ""}
                    onChange={noop}
                    onFocus={noop}
                    onBlur={noop}
                    disabled
                    uniformReadOnlyAppearance
                  />
                </div>
              </SectionCard>
            </div>
            <ReferenceGrid
              referenceNo={`RFQ-${header.rfqNumber}`}
              comments={header.remarks ?? ""}
              onReferenceNoChange={noop}
              onCommentsChange={noop}
              referenceNoDisabled
              commentsDisabled
              uniformReadOnlyAppearance
              referenceLabel="RFQ REF"
              onReferenceNoDisabledClick={restricted("Reference")}
              onCommentsDisabledClick={restricted("Remarks")}
            />
          </div>

          <div className="mt-3">
            <SectionCard title="Contents">
              <RfqLinesTable
                lines={state.lines}
                canEdit={state.canEditLines}
                onUpdateLine={state.updateLine}
                netTotal={state.totals.netTotal}
              />

              {state.formError ? (
                <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {state.formError}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 pt-4">
                {state.canEditLines ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={state.isSubmitting || !state.isDirty}
                      onClick={() => {
                        void state.handleSave();
                      }}
                    >
                      {state.isSubmitting ? "Saving…" : "Save Prices"}
                    </Button>
                    <Button
                      type="button"
                      disabled={state.isSubmitting || state.lines.length === 0}
                      onClick={() => {
                        void state.handleSubmit();
                      }}
                    >
                      {state.isSubmitting ? "Submitting…" : "Submit RFQ"}
                    </Button>
                  </>
                ) : null}

                {state.canConvert ? (
                  <Button
                    type="button"
                    disabled={state.isSubmitting}
                    onClick={() => {
                      void state.handleConvert();
                    }}
                  >
                    {state.isSubmitting ? "Converting…" : "Convert to PQ"}
                  </Button>
                ) : null}

                {!state.canEditLines && !state.canConvert ? (
                  <p className="text-xs text-zinc-500">No actions available for this status.</p>
                ) : null}
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}
    </CreatePageWrapper>
  );
}
