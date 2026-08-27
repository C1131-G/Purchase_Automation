import { useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import type { MouseEvent } from "react";

import { useDocumentDownload } from "@/features/create-pages/create-shared/hooks/use-document-download";
import { usePartnerAddressOptions } from "@/features/create-pages/create-shared/hooks/use-partner-address-options";
import { AddressGrid } from "@/features/create-pages/create-shared/components/grids/address-grid";
import { UploadGrid } from "@/features/create-pages/create-shared/components/grids/upload-grid";
import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";
import { DocumentDatesGrid } from "@/features/create-pages/create-shared/components/grids/document-dates-grid";
import { LogisticsGrid } from "@/features/create-pages/create-shared/components/grids/logistics-grid";
import { ReferenceGrid } from "@/features/create-pages/create-shared/components/grids/reference-grid";
import { VendorCustomerGrid } from "@/features/create-pages/create-shared/components/grids/vendor-customer-grid";
import { CopyToDropdown } from "@/features/create-pages/create-shared/components/layout/copy-to-dropdown";
import { CreatePageWrapper } from "@/features/create-pages/create-shared/components/layout/create-page-wrapper";
import { resolveActiveHighlightDocRef } from "@/features/create-pages/create-shared/utils/create-page-highlight";
import {
  parseISODate,
  toDisplayDate,
  toISODate,
} from "@/features/create-pages/create-shared/utils/create-order.utils";
import { RelationshipMapTracker } from "@/features/create-shared/components/layout/relationship-map-tracker";
import { PurchaseQuotationModals } from "@/features/create-pages/purchase-quotation-create/components/purchase-quotation-modals";
import { VendorChangeConfirmationDialog } from "@/features/create-pages/create-shared/components/modals/vendor-change-confirmation-dialog";
import { PurchaseQuotationProductSection } from "@/features/create-pages/purchase-quotation-create/components/purchase-quotation-product-section";
import { usePurchaseQuotationCreate } from "@/features/create-pages/purchase-quotation-create/hooks/use-purchase-quotation-create";
import {
  getPqRequiredDateMax,
  getPqRequiredDateMin,
  getPqValidUntilMin,
} from "@/features/create-pages/purchase-quotation-create/utils/pq-create.utils";
import { purchaseQuotationQueries } from "@/features/table-pages/purchase-quotations/api/purchase-quotation.queries";

const routeApi = getRouteApi("/_layout/purchase/create-quotation");

interface PurchaseQuotationCreateProps {
  mode?: "create" | "edit";
  docNum?: string;
  highlightDocNum?: string;
  highlightUntil?: number;
}

/**
 * PurchaseQuotationCreate: Orchestrator for the complex PQ creation multi-step flow.
 * State is centralized in usePurchaseQuotationCreate to keep the UI declarative and clean.
 * Leverages CreatePageWrapper for consistent entity layout.
 */
export function PurchaseQuotationCreate({
  mode = "create",
  docNum,
  highlightDocNum,
  highlightUntil,
}: PurchaseQuotationCreateProps) {
  const queryClient = useQueryClient();

  let draftDocNum: string | undefined;
  let draftDocEntry: string | undefined;
  if (mode === "create") {
    try {
      const search = routeApi.useSearch();
      draftDocNum = search.draftDocNum;
      draftDocEntry = search.draftDocEntry;
    } catch {
      // not in create route
    }
  }

  const state = usePurchaseQuotationCreate(
    docNum
      ? {
          docNum,
          mode,
        }
      : {
          draftDocNum,
          draftDocEntry,
          mode,
          onCreateSuccess: () => {},
        },
  );

  const todayIso = toISODate(state.today);
  const requiredDateMin = getPqRequiredDateMin(todayIso);
  const requiredDateMax = state.header.docDueDate
    ? getPqRequiredDateMax(state.header.docDueDate)
    : "";
  const validUntilMin = getPqValidUntilMin(
    state.header.requiredDate,
    state.productRows.map((row) => row.requiredDate ?? ""),
  );

  const pageTitle = state.isEditMode
    ? `Update Purchase Quotation ${docNum}`
    : draftDocNum
      ? `Create Purchase Quotation (Draft ${draftDocNum}${draftDocEntry ? ` #${draftDocEntry}` : ""})`
      : "Create Purchase Quotation";
  const highlightDocRef = resolveActiveHighlightDocRef(highlightDocNum, highlightUntil);
  // Pure create paints the shell immediately; field grids use per-query loading.
  // Draft/edit still wait for document hydrate.
  const isFormHydrating =
    !state.isEditMode && !draftDocNum
      ? false
      : (state.editDetailQuery.isLoading && !state.editDetailQuery.data) || !state.isEditHydrated;

  const handleVendorRestrictedClick = state.isEditMode
    ? (event: MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        state.showEditRestrictedToast("Vendor Info");
      }
    : undefined;

  const { billToOptions, shipToOptions } = usePartnerAddressOptions(state.codeInput);

  return (
    <div className="contents">
      <CreatePageWrapper
        dashboardName="Purchase Dashboard"
        dashboardUrl="/dashboard"
        breadcrumbParent={{
          label: "Purchase Quotations Data Table",
          onMouseEnter: () =>
            void queryClient.prefetchQuery(purchaseQuotationQueries.list({ limit: 10, page: 1 })),
          to: "/purchase/quotations",
        }}
        pageTitle={pageTitle}
        highlightDocRef={highlightDocRef}
        editError={
          state.isEditMode && state.editDetailQuery.isError
            ? state.editDetailQuery.error instanceof Error
              ? state.editDetailQuery.error.message
              : "Unable to load Purchase Quotation for editing."
            : null
        }
      >
        {state.trackerDocType && state.trackerDocEntry && (
          <div className="mb-4 mt-2 w-full">
            <div className="relative z-10 overflow-x-auto w-full">
              <RelationshipMapTracker
                docType={state.trackerDocType}
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
                      : "Unable to load vendors. Please login again."
                    : null
                }
                sectionTitle="Vendor Info"
                nameLabel="Vendor Name *"
                codeLabel="Vendor Code *"
                namePlaceholder="Select or Type Vendor"
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
                onNameBlur={state.finalizeVendorLookup}
                onCodeBlur={state.finalizeVendorLookup}
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
                salesEmployeeLabel="Buyer"
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
                onSalesEmployeeBlur={state.finalizeSalesEmployeeLookup}
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
                onWarehouseBlur={state.finalizeWarehouseLookup}
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
                onBranchBlur={state.finalizeBranchInput}
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
            requiredDateContainerRef={state.requiredDateContainerRef}
            toDisplayDate={toDisplayDate}
            parseISODate={parseISODate}
            toISODate={toISODate}
            docDueDateInvalid={Boolean(state.productSearchFieldErrors.docDueDate)}
            docDueDateErrorText={state.productSearchFieldErrors.docDueDate}
            docDateReadOnly={state.isClosed}
            docDueDateReadOnly={state.isClosed}
            uniformReadOnlyAppearance={state.isEditMode}
            onSetActiveDatePicker={state.setActiveDatePicker}
            onDocDateChange={(value) =>
              state.setHeader({ docDate: value, docDueDate: state.header.docDueDate })
            }
            onDocDueDateChange={(value) => {
              if (validUntilMin && value < validUntilMin) {
                return;
              }
              state.setHeader({
                docDueDate: value,
              });
              state.setProductSearchFieldErrors((prev) => ({
                ...prev,
                docDueDate: undefined,
              }));
            }}
            docDueDateLabel="VALID UNTIL"
            docDueDatePlaceholder="Select validity date"
            docDueDateMin={validUntilMin}
            showRequiredDate
            requiredDate={state.header.requiredDate}
            requiredDateReadOnly={state.isClosed}
            requiredDateFutureOnly={false}
            requiredDateMin={requiredDateMin}
            requiredDateMax={requiredDateMax}
            onRequiredDateChange={(value) => {
              if (
                !value ||
                value < requiredDateMin ||
                (requiredDateMax && value > requiredDateMax)
              ) {
                return;
              }
              state.setHeader({ requiredDate: value });
              state.setProductRows((prev) => prev.map((row) => ({ ...row, requiredDate: value })));
            }}
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
                readOnly={state.isClosed}
                uniformReadOnlyAppearance={state.isEditMode}
                billToOptions={billToOptions}
                shipToOptions={shipToOptions}
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
                billToLabel="Pay To Address"
              />
            </div>
          </div>
          <ReferenceGrid
            loading={isFormHydrating}
            referenceNo={state.header.referenceNo}
            comments={state.header.comments}
            referenceNoDisabled={state.isClosed}
            commentsDisabled={state.isClosed}
            onReferenceNoDisabledClick={() => state.showEditRestrictedToast("Vendor ref no")}
            onCommentsDisabledClick={() => state.showEditRestrictedToast("Remarks")}
            uniformReadOnlyAppearance={state.isEditMode}
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
            referenceLabel="VENDOR REF NO"
          />
        </div>

        {/* Attachments Section Card */}
        <div className="mt-3">
          <SectionCard title="ATTACHMENTS">
            <UploadGrid
              attachments={state.attachments}
              onAttachmentsChange={state.setAttachments}
              moduleName="PurchaseQuotation"
              readOnly={state.isClosed}
              loading={isFormHydrating}
            />
          </SectionCard>
        </div>

        <PurchaseQuotationProductSection
          sectionId="purchase-quotation-product-section"
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
          validUntilDate={state.header.docDueDate}
          requiredDateMin={requiredDateMin}
          requiredDateMax={requiredDateMax}
          warehouses={state.warehouses}
          warehousesLoading={state.warehousesQuery.isLoading}
          uoms={state.uoms}
          taxCodes={state.taxCodes}
          updateProductRow={state.updateProductRow}
          removeProductRow={state.removeProductRow}
          setProductRowDraft={state.setProductRowDraft}
          clearProductRowDraft={state.clearProductRowDraft}
          totals={state.totals}
          summaryCurrencyLabel={state.summaryCurrencyLabel}
          createError={state.createError}
          createDisabledReason={state.createDisabledReason}
          createPurchaseQuotationMutation={state.createPurchaseQuotationMutation}
          isSubmitting={
            state.createPurchaseQuotationMutation.isPending ||
            state.updatePurchaseQuotationMutation.isPending
          }
          missingMandatoryFields={state.missingMandatoryFields}
          requiredCompletionPercent={state.requiredCompletionPercent}
          handleCreateOrder={state.handleCreateOrder}
          onSubmitMode={state.handleCreateOrder}
          isSaved={state.isSaved}
          isDirty={state.isDirty}
          savedDocNum={state.savedDocNum}
          onDownload={useDocumentDownload(
            state.isEditMode ? docNum : state.savedDocNum,
            "purchase-quotations",
            "Purchase_Quotation",
          )}
          onReset={state.resetForm}
          isEditMode={state.isEditMode}
          isClosed={state.isClosed}
          allowSearchInEditMode={state.isEditMode}
          submitLabel={state.isEditMode ? "Update" : "Add"}
          submitLoadingText={state.isEditMode ? "Updating..." : "Adding..."}
          secondaryActions={
            !state.isSapClosed && state.rfqCopyAllowed && state.isEditMode && docNum ? (
              <CopyToDropdown
                docNum={String(docNum)}
                sourceDocType="PurchaseQuotation"
                targets={["PO"]}
              />
            ) : null
          }
          warehouseErrors={state.warehouseErrors}
          submitDisabled={state.submitDisabled}
        />
        <PurchaseQuotationModals state={state} />
        <VendorChangeConfirmationDialog
          open={state.pendingVendorPriceRefresh}
          onCancel={state.cancelVendorPriceRefresh}
          onConfirm={state.confirmVendorPriceRefresh}
          confirmDisabled={state.isRefreshingVendorPrices}
          description="Vendor changed. Update selected product prices to SAP last purchase price?"
        />
      </CreatePageWrapper>
    </div>
  );
}
