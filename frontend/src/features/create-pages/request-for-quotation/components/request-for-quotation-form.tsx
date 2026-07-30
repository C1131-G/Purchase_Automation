import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState, type MouseEvent } from "react";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { AddressGrid } from "@/features/create-pages/create-shared/components/grids/address-grid";
import { DocumentDatesGrid } from "@/features/create-pages/create-shared/components/grids/document-dates-grid";
import { LogisticsGrid } from "@/features/create-pages/create-shared/components/grids/logistics-grid";
import { ReferenceGrid } from "@/features/create-pages/create-shared/components/grids/reference-grid";
import { UploadGrid } from "@/features/create-pages/create-shared/components/grids/upload-grid";
import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";
import { VendorCustomerGrid } from "@/features/create-pages/create-shared/components/grids/vendor-customer-grid";
import { CreatePageWrapper } from "@/features/create-pages/create-shared/components/layout/create-page-wrapper";
import { resolveActiveHighlightDocRef } from "@/features/create-pages/create-shared/utils/create-page-highlight";
import { notifyEditRestrictedField } from "@/features/create-pages/create-shared/utils/create-feedback-toast";
import type { ActiveDatePicker } from "@/features/create-pages/create-shared/utils/create-order.types";
import {
  parseISODate,
  toDisplayDate,
  toISODate,
} from "@/features/create-pages/create-shared/utils/create-order.utils";
import { formatRfqDocNumber } from "@/features/table-pages/rfqs/utils/format-rfq-doc-number";
import { RelationshipMapTracker } from "@/features/create-shared/components/layout/relationship-map-tracker";
import { RfqProductSection } from "@/features/create-pages/request-for-quotation/components/rfq-product-section";
import { useRequestForQuotationForm } from "@/features/create-pages/request-for-quotation/hooks/use-request-for-quotation-form";
import { icRfqQueries } from "@/features/intercompany/api/intercompany.queries";
import { toSafeErrorMessage } from "@/shared/utils/error-message";

const noop = () => {};
const noopStr = (_value: string) => {};

interface RequestForQuotationFormProps {
  rfqId: number;
  highlightDocNum?: string;
  highlightUntil?: number;
}

/**
 * RFQ seller fill — sales-side layout like Sales Quotation (customer, logistics,
 * dates, address, reference, attachments, product rows).
 * Only quoted qty, quoted date, price, disc %, disc amount are editable; Submit only.
 */
export function RequestForQuotationForm({
  rfqId,
  highlightDocNum,
  highlightUntil,
}: RequestForQuotationFormProps) {
  const queryClient = useQueryClient();
  const state = useRequestForQuotationForm(rfqId);
  const header = state.header;
  const titleNumber = header?.rfqNumber ? formatRfqDocNumber(header.rfqNumber) : String(rfqId);
  const highlightDocRef = resolveActiveHighlightDocRef(highlightDocNum, highlightUntil);

  const [activeDatePicker, setActiveDatePicker] = useState<ActiveDatePicker>(null);
  const docDateContainerRef = useRef<HTMLDivElement>(null);
  const deliveryDateContainerRef = useRef<HTMLDivElement>(null);
  const requiredDateContainerRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const todayIso = toISODate(today);

  const editError =
    state.detailQuery.isError && !header
      ? toSafeErrorMessage(
          state.detailQuery.error instanceof Error ? state.detailQuery.error.message : undefined,
          "Unable to load Request For Quotation.",
        )
      : null;

  const isHydrating = state.detailQuery.isLoading && !header;

  const restrictedClick = (fieldName: string) => (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    notifyEditRestrictedField(fieldName);
  };

  if (isHydrating) {
    return <CreatePageRouteSkeleton />;
  }

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
      highlightDocRef={highlightDocRef}
      editError={editError}
    >
      {header ? (
        <>
          <div className="mb-4 mt-2 w-full">
            <div className="relative z-10 w-full overflow-x-auto">
              <RelationshipMapTracker
                docType="request-for-quotation"
                docEntry={rfqId}
                compact={true}
              />
            </div>
          </div>

          <div className="grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
            <div
              className="h-full cursor-not-allowed"
              onClickCapture={restrictedClick("Customer Info")}
            >
              <div className="pointer-events-none h-full">
                <VendorCustomerGrid
                  loading={false}
                  error={null}
                  sectionTitle="Customer Info"
                  nameLabel="Customer Name"
                  codeLabel="Customer Code"
                  namePlaceholder="Customer"
                  codePlaceholder="Customer code"
                  nameInput={header.customerName?.trim() || header.sourceCompanyName?.trim() || ""}
                  codeInput={header.customerCode?.trim() || ""}
                  nameFocused={false}
                  codeFocused={false}
                  nameSuggestions={[]}
                  codeSuggestions={[]}
                  onNameChange={noopStr}
                  onCodeChange={noopStr}
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

            <div
              className="h-full cursor-not-allowed"
              onClickCapture={restrictedClick("Logistics")}
            >
              <div className="pointer-events-none h-full">
                <LogisticsGrid
                  salesEmployeeLabel="Buyer"
                  salesEmployeeInput={
                    header.buyerName?.trim() ||
                    header.createdBy?.trim() ||
                    header.buyerCode?.trim() ||
                    ""
                  }
                  salesEmployeesLoading={false}
                  error={null}
                  salesEmployeeFocused={false}
                  salesEmployeeSuggestions={[]}
                  onSalesEmployeeChange={noopStr}
                  onSalesEmployeeFocus={noop}
                  onSalesEmployeeBlur={noop}
                  onOpenSalesEmployeePopup={noop}
                  onSelectSalesEmployee={noop}
                  salesEmployeeDisabled
                  readOnly
                  uniformReadOnlyAppearance
                  showWarehouseInsteadOfDocNum
                  warehouseLabel="Warehouse"
                  warehouseInput={header.warehouseCode?.trim() || state.defaultWarehouseCode || ""}
                  warehousesLoading={false}
                  warehouseFocused={false}
                  warehouseSuggestions={[]}
                  onWarehouseChange={noopStr}
                  onWarehouseFocus={noop}
                  onWarehouseBlur={noop}
                  onOpenWarehousePopup={noop}
                  onSelectWarehouse={noop}
                  warehouseDisabled
                />
              </div>
            </div>

            <div
              className="h-full cursor-not-allowed"
              onClickCapture={restrictedClick("Document Dates")}
            >
              <div className="pointer-events-none h-full">
                <DocumentDatesGrid
                  loading={false}
                  docDate={header.docDate?.slice(0, 10) || todayIso}
                  docDueDate={header.docDueDate?.slice(0, 10) || ""}
                  today={today}
                  activeDatePicker={activeDatePicker}
                  docDateContainerRef={docDateContainerRef}
                  deliveryDateContainerRef={deliveryDateContainerRef}
                  requiredDateContainerRef={requiredDateContainerRef}
                  toDisplayDate={toDisplayDate}
                  parseISODate={parseISODate}
                  toISODate={toISODate}
                  docDateReadOnly
                  docDueDateReadOnly
                  uniformReadOnlyAppearance
                  onSetActiveDatePicker={setActiveDatePicker}
                  onDocDateChange={noopStr}
                  onDocDueDateChange={noopStr}
                  docDueDateLabel="VALID UNTIL"
                  docDueDatePlaceholder="—"
                  showRequiredDate
                  requiredDate={header.requiredDate?.slice(0, 10) || ""}
                  requiredDateReadOnly
                  onRequiredDateChange={noopStr}
                />
              </div>
            </div>
          </div>

          <div className="mt-3 grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
            <div
              className="h-full cursor-not-allowed lg:col-span-2"
              onClickCapture={restrictedClick("Address")}
            >
              <div className="pointer-events-none h-full">
                <AddressGrid
                  loading={false}
                  billToAddress={header.billToAddress ?? ""}
                  shipToAddress={header.shipToAddress ?? ""}
                  readOnly
                  uniformReadOnlyAppearance
                  billToOptions={[]}
                  shipToOptions={[]}
                  onBillToAddressChange={noopStr}
                  onShipToAddressChange={noopStr}
                  billToLabel="Pay To Address"
                />
              </div>
            </div>
            <div
              className="h-full cursor-not-allowed"
              onClickCapture={restrictedClick("Reference")}
            >
              <div className="pointer-events-none h-full">
                <ReferenceGrid
                  loading={false}
                  referenceNo={header.vendorRefNo?.trim() || ""}
                  comments={header.remarks ?? ""}
                  uniformReadOnlyAppearance
                  onReferenceNoChange={noopStr}
                  onCommentsChange={noopStr}
                  referenceNoDisabled
                  commentsDisabled
                  referenceLabel="CUSTOMER REF NO"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 cursor-not-allowed" onClickCapture={restrictedClick("Attachments")}>
            <div className="pointer-events-none">
              <SectionCard title="ATTACHMENTS">
                <UploadGrid
                  attachments={[]}
                  onAttachmentsChange={noop}
                  moduleName="RequestForQuotation"
                  readOnly
                  loading={false}
                />
              </SectionCard>
            </div>
          </div>

          <div className="mt-3">
            <RfqProductSection
              productRows={state.productRows}
              productRowDrafts={state.productRowDrafts}
              updateProductRow={state.updateProductRow}
              removeProductRow={state.removeProductRow}
              setProductRowDraft={state.setProductRowDraft}
              clearProductRowDraft={state.clearProductRowDraft}
              openProductPopup={state.openProductPopup}
              prefetchProducts={state.prefetchProducts}
              totals={state.totals}
              canEdit={state.canEditLines}
              canSubmit={state.canSubmit}
              isSubmitting={state.isSubmitting}
              formError={state.formError}
              onSubmit={() => {
                void state.handleSubmit();
              }}
            />
          </div>
        </>
      ) : null}
    </CreatePageWrapper>
  );
}
