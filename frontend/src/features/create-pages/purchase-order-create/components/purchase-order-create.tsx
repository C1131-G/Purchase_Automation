import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import type { MouseEvent } from "react";

import { useDocumentDownload } from "@/features/create-pages/create-shared/hooks/use-document-download";

import { AddressGrid } from "@/features/create-pages/create-shared/components/grids/address-grid";
import { UploadGrid } from "@/features/create-pages/create-shared/components/grids/upload-grid";
import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";
import { DocumentDatesGrid } from "@/features/create-pages/create-shared/components/grids/document-dates-grid";
import { LogisticsGrid } from "@/features/create-pages/create-shared/components/grids/logistics-grid";
import { ReferenceGrid } from "@/features/create-pages/create-shared/components/grids/reference-grid";
import { VendorCustomerGrid } from "@/features/create-pages/create-shared/components/grids/vendor-customer-grid";
import { CopyFromDropdown } from "@/features/create-pages/create-shared/components/layout/copy-from-dropdown";
import { CopyToDropdown } from "@/features/create-pages/create-shared/components/layout/copy-to-dropdown";
import { CreatePageWrapper } from "@/features/create-pages/create-shared/components/layout/create-page-wrapper";
import {
  CopyFromDialog,
  type SourceDocType,
} from "@/features/create-pages/create-shared/components/modals/copy-from-dialog";
import {
  parseISODate,
  toDisplayDate,
  toISODate,
} from "@/features/create-pages/create-shared/utils/create-order.utils";
import { RelationshipMapTracker } from "@/features/create-shared/components/layout/relationship-map-tracker";
import { PurchaseOrderModals } from "@/features/create-pages/purchase-order-create/components/purchase-order-modals";
import { PurchaseOrderProductSection } from "@/features/create-pages/purchase-order-create/components/purchase-order-product-section";
import { usePurchaseOrderCreate } from "@/features/create-pages/purchase-order-create/hooks/use-purchase-order-create";
import { purchaseOrderQueries } from "@/features/table-pages/purchase-orders/api/purchase-order.queries";

interface PurchaseOrderCreateProps {
  mode?: "create" | "edit";
  docNum?: string;
  sourceDocNum?: string | undefined;
  sourceDocType?: "PurchaseQuotation" | undefined;
  draftDocNum?: string | undefined;
  draftDocEntry?: string | undefined;
}

/**
 * PurchaseOrderCreate: Orchestrator for the complex PO creation multi-step flow.
 * State is centralized in usePurchaseOrderCreate to keep the UI declarative and clean.
 * Leverages CreatePageWrapper for consistent entity layout.
 */
export function PurchaseOrderCreate({
  mode = "create",
  docNum,
  sourceDocNum,
  sourceDocType,
  draftDocNum,
  draftDocEntry,
}: PurchaseOrderCreateProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [copyFromDialogOpen, setCopyFromDialogOpen] = useState(false);
  const [sourceCleared, setSourceCleared] = useState(false);

  const state = usePurchaseOrderCreate(
    docNum
      ? {
          docNum,
          mode,
        }
      : {
          mode,
          sourceDocNum,
          sourceDocType,
          draftDocNum,
          draftDocEntry,
          onCreateSuccess: () => {
            setSourceCleared(false);
          },
        },
  );

  const handleCopyFromSelect = (
    selected: {
      docNum: string;
      docType: SourceDocType;
    }[],
  ) => {
    setSourceCleared(false);
    if (selected.length === 0) {
      router.navigate({
        to: "/purchase/create-order",
        search: {},
        viewTransition: true,
      });
      return;
    }
    const docNums = selected.map((s) => s.docNum).join(",");
    const { docType } = selected[0]!;
    router.navigate({
      to: "/purchase/create-order",
      search: { sourceDocNum: docNums, sourceDocType: docType as "PurchaseQuotation" },
      viewTransition: true,
    });
  };

  const pageTitle = state.isEditMode
    ? `Update Purchase Order ${docNum || ""}`
    : draftDocNum
      ? `Create Purchase Order (Draft ${draftDocNum}${draftDocEntry ? ` #${draftDocEntry}` : ""})`
      : "Create Purchase Order";
  const committedDocNums =
    !sourceCleared && sourceDocNum ? sourceDocNum.split(",").filter(Boolean) : [];
  const isFormHydrating =
    !state.isEditMode && !draftDocNum
      ? (state.vendorsQuery.isLoading &&
          state.warehousesQuery.isLoading &&
          state.salesEmployeesQuery.isLoading &&
          !state.vendorsQuery.data) ||
        state.isSourceHydrating
      : (state.editDetailQuery.isLoading && !state.editDetailQuery.data) || !state.isEditHydrated;

  const handleVendorRestrictedClick = state.isEditMode
    ? (event: MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        state.showEditRestrictedToast("Vendor Info");
      }
    : undefined;

  const activeVendor = (state.vendors as any[]).find(
    (v) => String(v.code) === String(state.codeInput),
  );
  const billToOptions = activeVendor?.addresses
    ? activeVendor.addresses
        .filter((addr: any) => addr.addressType === "B")
        .map((addr: any) => ({
          addressName: addr.addressName,
          addressText: addr.addressText,
          addressType: addr.addressType,
        }))
    : [];
  const shipToOptions = activeVendor?.addresses
    ? activeVendor.addresses
        .filter((addr: any) => addr.addressType === "S")
        .map((addr: any) => ({
          addressName: addr.addressName,
          addressText: addr.addressText,
          addressType: addr.addressType,
        }))
    : [];

  return (
    <CreatePageWrapper
      dashboardName="Purchase Dashboard"
      dashboardUrl="/dashboard/purchase"
      breadcrumbParent={{
        label: "Purchase Orders Data Table",
        onMouseEnter: () =>
          void queryClient.prefetchQuery(purchaseOrderQueries.list({ limit: 10, page: 1 })),
        to: "/purchase/orders",
      }}
      pageTitle={pageTitle}
      editError={
        state.isEditMode && state.editDetailQuery.isError
          ? state.editDetailQuery.error instanceof Error
            ? state.editDetailQuery.error.message
            : "Unable to load purchase order for editing."
          : null
      }
      topActions={
        !state.isEditMode && !state.draftDocNum ? (
          <CopyFromDropdown
            vendorCode={state.codeInput}
            vendorName={state.nameInput}
            sourceDocTypes={["PurchaseQuotation"]}
            onSelectSource={() => setCopyFromDialogOpen(true)}
            onReset={
              committedDocNums.length > 0
                ? () => {
                    state.setProductRows([]);
                    state.setProductRowDrafts({});
                    state.setHeader({ referenceNo: "", comments: "" });
                    state.resetWarehouse();
                    setSourceCleared(true);
                  }
                : undefined
            }
          />
        ) : null
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
      <CopyFromDialog
        open={copyFromDialogOpen}
        onClose={() => setCopyFromDialogOpen(false)}
        sourceDocType="PurchaseQuotation"
        vendorCode={state.codeInput}
        vendorName={state.nameInput}
        committedDocNums={committedDocNums}
        onSelectDocuments={handleCopyFromSelect}
      />
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
              uniformReadOnlyAppearance={state.isEditMode}
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
          docDateReadOnly={false}
          docDueDateReadOnly={state.isClosed}
          uniformReadOnlyAppearance={state.isEditMode}
          onSetActiveDatePicker={state.setActiveDatePicker}
          onDocDateChange={(value) => state.setHeader({ docDate: value })}
          onDocDueDateChange={(value) => {
            state.setHeader({ docDueDate: value });
            state.setProductSearchFieldErrors((prev) => ({
              ...prev,
              docDueDate: undefined,
            }));
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
            moduleName="PurchaseOrder"
            readOnly={state.isClosed}
            loading={isFormHydrating}
          />
        </SectionCard>
      </div>

      <PurchaseOrderProductSection
        sectionId="purchase-order-product-section"
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
        createPurchaseOrderMutation={state.createPurchaseOrderMutation}
        isSubmitting={
          state.createPurchaseOrderMutation.isPending || state.updatePurchaseOrderMutation.isPending
        }
        missingMandatoryFields={state.missingMandatoryFields}
        requiredCompletionPercent={state.requiredCompletionPercent}
        handleCreateOrder={state.handleCreateOrder}
        onSubmitMode={state.handleCreateOrder}
        isSaved={state.isSaved}
        savedDocNum={state.savedDocNum}
        onDownload={useDocumentDownload(
          mode === "edit" ? docNum : state.savedDocNum,
          "purchase-orders",
          "Purchase_Order",
        )}
        onReset={state.resetForm}
        isEditMode={state.isEditMode}
        isClosed={state.isClosed}
        allowSearchInEditMode={state.isEditMode}
        submitLabel={state.isEditMode ? "Update" : "Add"}
        submitLoadingText={state.isEditMode ? "Updating..." : "Adding..."}
        secondaryActions={
          state.isEditMode && !state.isClosed ? (
            <CopyToDropdown
              docNum={docNum!}
              sourceDocType="PurchaseOrder"
              targets={["GRPO", "AP Invoice"]}
            />
          ) : null
        }
        warehouseErrors={state.warehouseErrors}
        submitDisabled={state.submitDisabled}
        isDirty={state.isDirty}
      />
      <PurchaseOrderModals state={state} />
    </CreatePageWrapper>
  );
}
