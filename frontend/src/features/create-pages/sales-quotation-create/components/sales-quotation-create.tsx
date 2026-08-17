import { useQueryClient } from "@tanstack/react-query";
import type { MouseEvent } from "react";

import { useDocumentDownload } from "@/features/create-pages/create-shared/hooks/use-document-download";
import { usePartnerAddressOptions } from "@/features/create-pages/create-shared/hooks/use-partner-address-options";
import { AddressGrid } from "@/features/create-pages/create-shared/components/grids/address-grid";
import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";
import { UploadGrid } from "@/features/create-pages/create-shared/components/grids/upload-grid";
import { DocumentDatesGrid } from "@/features/create-pages/create-shared/components/grids/document-dates-grid";
import { LogisticsGrid } from "@/features/create-pages/create-shared/components/grids/logistics-grid";
import { ReferenceGrid } from "@/features/create-pages/create-shared/components/grids/reference-grid";
import { VendorCustomerGrid } from "@/features/create-pages/create-shared/components/grids/vendor-customer-grid";
import { CreatePageWrapper } from "@/features/create-pages/create-shared/components/layout/create-page-wrapper";
import { resolveActiveHighlightDocRef } from "@/features/create-pages/create-shared/utils/create-page-highlight";
import {
  parseISODate,
  toDisplayDate,
  toISODate,
} from "@/features/create-pages/create-shared/utils/create-order.utils";
import { RelationshipMapTracker } from "@/features/create-shared/components/layout/relationship-map-tracker";
import { SalesQuotationModals } from "@/features/create-pages/sales-quotation-create/components/sales-quotation-modals";
import { SalesQuotationProductSection } from "@/features/create-pages/sales-quotation-create/components/sales-quotation-product-section";
import { useSalesQuotationCreate } from "@/features/create-pages/sales-quotation-create/hooks/use-sales-quotation-create";
import { salesQuotationQueries } from "@/features/table-pages/sales-quotations/api/sales-quotation.queries";

interface SalesQuotationCreateProps {
  mode?: "create" | "edit";
  docNum?: string;
  draftDocNum?: string | undefined;
  draftDocEntry?: string | undefined;
  highlightDocNum?: string;
  highlightUntil?: number;
}

/**
 * SalesQuotationCreate: Orchestrator for the complex SQ creation multi-step flow.
 * State is centralized in useSalesQuotationCreate to keep the UI declarative and clean.
 * Leverages CreatePageWrapper for consistent entity layout.
 */
export function SalesQuotationCreate({
  mode = "create",
  docNum,
  draftDocNum,
  draftDocEntry,
  highlightDocNum,
  highlightUntil,
}: SalesQuotationCreateProps) {
  const queryClient = useQueryClient();
  const state = useSalesQuotationCreate(
    docNum
      ? { docNum, mode }
      : {
          mode,
          draftDocNum: draftDocNum || "",
          draftDocEntry: draftDocEntry || "",
        },
  );

  const pageTitle = state.isEditMode
    ? `Sales Quotation ${docNum}`
    : draftDocNum
      ? `Create Sales Quotation (Draft ${draftDocNum}${draftDocEntry ? ` #${draftDocEntry}` : ""})`
      : "Create Sales Quotation";
  const highlightDocRef = resolveActiveHighlightDocRef(highlightDocNum, highlightUntil);
  // Pure create paints the shell immediately; field grids use per-query loading.
  // Draft/edit still wait for document hydrate.
  const isFormHydrating = !state.isEditMode
    ? draftDocNum
      ? !state.isEditHydrated
      : false
    : (state.editDetailQuery.isLoading && !state.editDetailQuery.data) || !state.isEditHydrated;

  const handleVendorRestrictedClick = state.isEditMode
    ? (event: MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        state.showEditRestrictedToast("Customer Info");
      }
    : undefined;

  const { billToOptions, shipToOptions } = usePartnerAddressOptions(state.codeInput);

  return (
    <div className="contents">
      <CreatePageWrapper
        dashboardName="Sales Dashboard"
        dashboardUrl="/dashboard"
        breadcrumbParent={{
          label: "Sales Quotations Data Table",
          onMouseEnter: () =>
            void queryClient.prefetchQuery(salesQuotationQueries.list({ limit: 10, page: 1 })),
          to: "/sales/quotations",
        }}
        pageTitle={pageTitle}
        highlightDocRef={highlightDocRef}
        editError={
          state.isEditMode && state.editDetailQuery.isError
            ? state.editDetailQuery.error instanceof Error
              ? state.editDetailQuery.error.message
              : "Unable to load sales quotation for editing."
            : null
        }
      >
        {state.trackerDocType && state.trackerDocEntry && !draftDocNum && (
          <div className="mb-4 mt-2 w-full">
            <div className="relative z-10 overflow-x-auto w-full">
              <RelationshipMapTracker
                docType={state.trackerDocType as any}
                docEntry={state.trackerDocEntry}
                compact={true}
              />
            </div>
          </div>
        )}

        <div className="grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
          <div
            onClickCapture={handleVendorRestrictedClick}
            className={`h-full ${state.isEditMode ? "cursor-not-allowed" : ""}`}
          >
            <div className={`h-full ${state.isEditMode ? "pointer-events-none" : ""}`}>
              <VendorCustomerGrid
                loading={state.vendorsQuery.isLoading || isFormHydrating}
                error={
                  state.vendorsQuery.isError
                    ? state.vendorsQuery.error instanceof Error
                      ? state.vendorsQuery.error.message
                      : "Unable to load customers. Please login again."
                    : null
                }
                sectionTitle="Customer Info"
                nameLabel="Customer Name *"
                codeLabel="Customer Code *"
                namePlaceholder="Select or Type Customer"
                codePlaceholder="Select or Type Code"
                nameInput={state.nameInput}
                codeInput={state.codeInput}
                nameFocused={state.nameFocused}
                codeFocused={state.codeFocused}
                nameSuggestions={state.nameSuggestions}
                codeSuggestions={state.codeSuggestions}
                onNameChange={state.handleVendorNameChange}
                onCodeChange={state.handleVendorCodeChange}
                onNameFocus={() => state.setNameFocused(true)}
                onCodeFocus={() => state.setCodeFocused(true)}
                onNameBlur={() => setTimeout(() => state.setNameFocused(false), 120)}
                onCodeBlur={() => setTimeout(() => state.setCodeFocused(false), 120)}
                onOpenNamePopup={() => state.openPopup("vendor-name")}
                onOpenCodePopup={() => state.openPopup("vendor-code")}
                onSelectVendor={state.selectVendor}
                vendorNameInvalid={Boolean(state.productSearchFieldErrors.vendorName)}
                vendorCodeInvalid={Boolean(state.productSearchFieldErrors.vendorCode)}
                vendorNameErrorText={state.productSearchFieldErrors.vendorName}
                vendorCodeErrorText={state.productSearchFieldErrors.vendorCode}
                nameDisabled={state.isEditMode}
                codeDisabled={state.isEditMode}
                {...state.seriesGridProps}
                seriesDisabled={state.isEditMode || state.seriesDisabled}
                {...(state.isEditMode
                  ? {}
                  : {
                      onOpenSeriesPopup: () => state.openPopup("series"),
                      onSelectSeries: state.selectSeries,
                    })}
              />
            </div>
          </div>

          <div
            className={`h-full ${state.isClosed ? "cursor-not-allowed" : ""}`}
            onClickCapture={
              state.isClosed
                ? (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    state.showEditRestrictedToast("Logistics");
                  }
                : undefined
            }
          >
            <div className={`h-full ${state.isClosed ? "pointer-events-none" : ""}`}>
              <LogisticsGrid
                salesEmployeeLabel="Sales Employee"
                salesEmployeeInput={state.salesEmployeeInput}
                salesEmployeesLoading={state.salesEmployeesQuery.isLoading || isFormHydrating}
                error={
                  state.salesEmployeesQuery.isError || state.warehousesQuery.isError
                    ? "Unable to load logistics details."
                    : null
                }
                salesEmployeeFocused={state.salesEmployeeFocused}
                salesEmployeeSuggestions={state.salesEmployeeSuggestions}
                onSalesEmployeeChange={state.handleSalesEmployeeChange}
                onSalesEmployeeFocus={() => state.setSalesEmployeeFocused(true)}
                onSalesEmployeeBlur={() =>
                  setTimeout(() => state.setSalesEmployeeFocused(false), 120)
                }
                onOpenSalesEmployeePopup={() => state.openPopup("sales-employee")}
                onSelectSalesEmployee={state.selectSalesEmployee}
                salesEmployeeDisabled={state.isClosed}
                readOnly={state.isClosed}
                uniformReadOnlyAppearance={state.isClosed}
                showWarehouseInsteadOfDocNum={true}
                warehouseLabel="Warehouse"
                warehouseInput={state.warehouseInput}
                warehousesLoading={state.warehousesQuery.isLoading || isFormHydrating}
                warehouseFocused={state.warehouseFocused}
                warehouseSuggestions={state.warehouseSuggestions}
                onWarehouseChange={state.handleWarehouseChange}
                onWarehouseFocus={() => state.setWarehouseFocused(true)}
                onWarehouseBlur={() => setTimeout(() => state.setWarehouseFocused(false), 120)}
                onOpenWarehousePopup={() => state.openPopup("warehouse")}
                onSelectWarehouse={state.selectWarehouse}
                warehouseInvalid={Boolean(state.productSearchFieldErrors.warehouseCode)}
                warehouseErrorText={state.productSearchFieldErrors.warehouseCode}
                warehouseDisabled={state.isClosed}
                showBranch={state.showBranch}
                branchInput={state.branchInput}
                branchesLoading={state.branchesQuery?.isLoading || isFormHydrating}
                branchFocused={state.branchFocused}
                branchSuggestions={state.branchSuggestions}
                onBranchChange={state.handleBranchChange}
                onBranchFocus={() => state.setBranchFocused(true)}
                onBranchBlur={() => setTimeout(() => state.setBranchFocused(false), 120)}
                onOpenBranchPopup={() => state.openPopup("branch")}
                onSelectBranch={state.selectBranch}
                branchPlaceholder={state.branchPlaceholder ?? "No Branch"}
                branchDisabled={state.isClosed || Boolean(state.branchDisabled)}
              />
            </div>
          </div>

          <DocumentDatesGrid
            loading={isFormHydrating}
            docDate={state.header.docDate}
            docDueDate={state.header.docDueDate}
            today={state.today}
            activeDatePicker={state.activeDatePicker}
            docDateContainerRef={state.docDateContainerRef}
            deliveryDateContainerRef={state.deliveryDateContainerRef}
            toDisplayDate={toDisplayDate}
            parseISODate={parseISODate}
            toISODate={toISODate}
            onSetActiveDatePicker={state.setActiveDatePicker}
            onDocDateChange={(value) => state.setHeader({ docDate: value })}
            onDocDueDateChange={(value) => {
              state.setHeader({ docDueDate: value });
              state.setProductSearchFieldErrors((prev) => ({
                ...prev,
                docDueDate: undefined,
              }));
            }}
            docDateReadOnly={state.isClosed}
            docDueDateReadOnly={state.isClosed}
            uniformReadOnlyAppearance={state.isClosed}
            docDueDateLabel="VALID UNTIL"
            docDueDatePlaceholder="Select validity date"
          />
        </div>

        <div className="mt-3 grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
          <div
            className={`h-full lg:col-span-2 ${state.isClosed ? "cursor-not-allowed" : ""}`}
            onClickCapture={
              state.isClosed
                ? (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    state.showEditRestrictedToast("Address");
                  }
                : undefined
            }
          >
            <div className={`h-full ${state.isClosed ? "pointer-events-none" : ""}`}>
              <AddressGrid
                loading={isFormHydrating}
                billToAddress={state.billToAddress}
                shipToAddress={state.shipToAddress}
                billToLabel="Pay To Address"
                billToOptions={billToOptions}
                shipToOptions={shipToOptions}
                readOnly={state.isClosed}
                uniformReadOnlyAppearance={state.isClosed}
                onBillToAddressChange={(value) => {
                  state.setBillToAddress(value);
                  state.setProductSearchFieldErrors((prev) => ({
                    ...prev,
                    billToAddress: value.trim() ? undefined : prev.billToAddress,
                  }));
                }}
                onShipToAddressChange={(value) => {
                  state.setShipToAddress(value);
                  state.setProductSearchFieldErrors((prev) => ({
                    ...prev,
                    shipToAddress: value.trim() ? undefined : prev.shipToAddress,
                  }));
                }}
              />
            </div>
          </div>
          <ReferenceGrid
            loading={isFormHydrating}
            referenceNo={state.header.referenceNo}
            comments={state.header.comments}
            referenceNoDisabled={state.isClosed}
            commentsDisabled={state.isClosed}
            onReferenceNoDisabledClick={() => state.showEditRestrictedToast("Customer ref no")}
            onCommentsDisabledClick={() => state.showEditRestrictedToast("Remarks")}
            uniformReadOnlyAppearance={state.isClosed}
            onReferenceNoChange={(value) => {
              state.setHeader({ referenceNo: value });
              state.setProductSearchFieldErrors((prev) => ({
                ...prev,
                referenceNo: undefined,
              }));
            }}
            onCommentsChange={(value) => {
              state.setHeader({ comments: value });
              state.setProductSearchFieldErrors((prev) => ({
                ...prev,
                comments: undefined,
              }));
            }}
            referenceNoInvalid={Boolean(state.productSearchFieldErrors.referenceNo)}
            commentsInvalid={Boolean(state.productSearchFieldErrors.comments)}
            referenceNoErrorText={state.productSearchFieldErrors.referenceNo}
            commentsErrorText={state.productSearchFieldErrors.comments}
          />
        </div>

        {/* Attachments Section Card */}
        <div className="mt-3">
          <SectionCard title="ATTACHMENTS">
            <UploadGrid
              attachments={state.attachments}
              onAttachmentsChange={state.setAttachments}
              moduleName="SalesQuotation"
              readOnly={state.isClosed}
              loading={isFormHydrating}
            />
          </SectionCard>
        </div>

        <SalesQuotationProductSection
          sectionId="sales-quotation-product-section"
          submitDisabled={state.submitDisabled}
          isDirty={state.isDirty}
          missingSearchMandatoryFields={state.missingSearchMandatoryFields}
          searchRequiredCompletionPercent={state.searchRequiredCompletionPercent}
          searchMandatoryFields={state.searchMandatoryFields}
          openProductPopup={state.openProductPopup}
          prefetchProducts={state.prefetchProducts}
          productRows={state.productRows}
          productRowDrafts={state.productRowDrafts}
          setProductRows={state.setProductRows}
          vendorCode={state.codeInput}
          vendorName={state.nameInput}
          defaultWarehouseCode={state.effectiveWarehouseCode}
          warehouses={state.warehouses}
          warehousesLoading={state.warehousesQuery.isLoading}
          updateProductRow={state.updateProductRow}
          removeProductRow={state.removeProductRow}
          setProductRowDraft={state.setProductRowDraft}
          clearProductRowDraft={state.clearProductRowDraft}
          totals={state.totals}
          summaryCurrencyLabel={state.summaryCurrencyLabel}
          createError={state.createError}
          createDisabledReason={state.createDisabledReason}
          createSalesQuotationMutation={state.createSalesQuotationMutation}
          missingMandatoryFields={state.missingMandatoryFields}
          requiredCompletionPercent={state.requiredCompletionPercent}
          handleCreateOrder={state.handleCreateOrder}
          isEditMode={state.isEditMode}
          onSubmitMode={state.handleCreateOrder}
          isSaved={state.isSaved}
          savedDocNum={state.savedDocNum}
          onDownload={useDocumentDownload(
            mode === "edit" ? docNum : state.savedDocNum,
            "sales-quotations",
            "Sales_Quotation",
          )}
          onReset={state.resetForm}
          isClosed={state.isClosed}
          submitLabel={state.isEditMode ? "Update" : "Add"}
          submitLoadingText={state.isEditMode ? "Updating..." : "Adding..."}
        />
        <SalesQuotationModals state={state} />
      </CreatePageWrapper>
    </div>
  );
}
