import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import type { MouseEvent } from "react";

import { isSerialManaged } from "@/features/create-pages/create-shared/utils/product-lot-allocations";
import { lotSetupPath } from "@/features/create-pages/create-shared/lot-setup/lot-setup.utils";
import { useGRPOLotSessionStore } from "@/store/create/grpo-lot-session.store";

import { useDocumentDownload } from "@/features/create-pages/create-shared/hooks/use-document-download";
import { usePartnerAddressOptions } from "@/features/create-pages/create-shared/hooks/use-partner-address-options";

import { AddressGrid } from "@/features/create-pages/create-shared/components/grids/address-grid";
import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";
import { UploadGrid } from "@/features/create-pages/create-shared/components/grids/upload-grid";
import { DocumentDatesGrid } from "@/features/create-pages/create-shared/components/grids/document-dates-grid";
import { LogisticsGrid } from "@/features/create-pages/create-shared/components/grids/logistics-grid";
import { ReferenceGrid } from "@/features/create-pages/create-shared/components/grids/reference-grid";
import { VendorCustomerGrid } from "@/features/create-pages/create-shared/components/grids/vendor-customer-grid";
import { CopyFromDropdown } from "@/features/create-pages/create-shared/components/layout/copy-from-dropdown";
import { CopyToDropdown } from "@/features/create-pages/create-shared/components/layout/copy-to-dropdown";
import { CreatePageWrapper } from "@/features/create-pages/create-shared/components/layout/create-page-wrapper";
import {
  LazyCopyFromDialog,
  type SourceDocType,
} from "@/features/create-pages/create-shared/components/modals/lazy-copy-from-dialog";

import {
  parseISODate,
  toDisplayDate,
  toISODate,
} from "@/features/create-pages/create-shared/utils/create-order.utils";
import { RelationshipMapTracker } from "@/features/create-shared/components/layout/relationship-map-tracker";
import { GRPOModals } from "@/features/create-pages/grpo-create/components/grpo-modals";
import { GRPOProductSection } from "@/features/create-pages/grpo-create/components/grpo-product-section";
import { useGRPOCreate } from "@/features/create-pages/grpo-create/hooks/use-grpo-create";
import { GRPO_FIELD_LABEL_TEXT } from "@/features/create-pages/grpo-create/utils/grpo-create.utils";

interface GRPOCreateProps {
  mode?: "create" | "edit";
  docNum?: string;
  sourceDocNum?: string | undefined;
  sourceDocType?: "PurchaseOrder" | "PurchaseQuotation" | undefined;
  draftDocNum?: string | undefined;
  draftDocEntry?: string | undefined;
}

/**
 * GRPOCreate: Handles document logic for Goods Receipt PO.
 */
export function GRPOCreate({
  mode = "create",
  docNum,
  sourceDocNum,
  sourceDocType,
  draftDocNum,
  draftDocEntry,
}: GRPOCreateProps) {
  const router = useRouter();
  const state = useGRPOCreate({
    docNum: docNum || "",
    mode,
    onCreateSuccess: () => {
      setSourceCleared(false);
    },
    sourceDocNum,
    sourceDocType,
    draftDocNum,
    draftDocEntry,
  });

  const [copyFromDialogOpen, setCopyFromDialogOpen] = useState(false);
  const [copyFromSourceType, setCopyFromSourceType] = useState<
    "PurchaseOrder" | "PurchaseQuotation" | null
  >(null);
  const [sourceCleared, setSourceCleared] = useState(false);

  const committedDocNums =
    !sourceCleared && sourceDocNum ? sourceDocNum.split(",").filter(Boolean) : [];
  const activeSourceType = committedDocNums.length > 0 ? (sourceDocType ?? null) : null;

  const isFormHydrating =
    (mode === "edit" && !!docNum && !state.isEditHydrated) || state.isSourceHydrating;

  const handleRestrictedClick =
    (fieldName: string) => (event: MouseEvent<HTMLDivElement> | undefined) => {
      if (state.isEditMode) {
        event?.preventDefault();
        event?.stopPropagation();
        state.showEditRestrictedToast(fieldName);
      }
    };

  const handleCopyFromSelect = (
    selected: {
      docNum: string;
      docType: SourceDocType;
    }[],
  ) => {
    setSourceCleared(false);
    if (selected.length === 0) {
      router.navigate({
        to: "/purchase/create-grpo",
        search: {},
      });
      return;
    }
    const docNums = selected.map((s) => s.docNum).join(",");
    const { docType } = selected[0]!;
    router.navigate({
      to: "/purchase/create-grpo",
      search: {
        sourceDocNum: docNums,
        sourceDocType: docType as "PurchaseOrder" | "PurchaseQuotation",
      },
    });
  };

  const { billToOptions, shipToOptions } = usePartnerAddressOptions(state.vendorCodeInput);
  const setLotReturnTo = useGRPOLotSessionStore((session) => session.setReturnTo);

  const handleOpenLotPage = (row: { id: string; manSerNum?: string | undefined }) => {
    const location = router.state.location;
    setLotReturnTo({
      search: (location.search as Record<string, unknown>) ?? {},
      to: location.pathname.replace(/^\/_layout/, "") || "/purchase/create-grpo",
    });
    void router.navigate({
      search: { selectedRowId: row.id },
      to: lotSetupPath(isSerialManaged(row) ? "serials" : "batches"),
    });
  };

  return (
    <CreatePageWrapper
      dashboardName="Purchase Dashboard"
      dashboardUrl="/dashboard"
      breadcrumbParent={{
        label: "GRPO Data Table",
        to: "/purchase/grpo",
      }}
      pageTitle={
        state.isEditMode
          ? `Update GRPO ${docNum}`
          : draftDocNum
            ? `Create GRPO (Draft ${draftDocNum}${draftDocEntry ? ` #${draftDocEntry}` : ""})`
            : "Create GRPO"
      }
      editError={
        state.isEditMode && state.editDetailQuery.isError
          ? state.editDetailQuery.error instanceof Error
            ? state.editDetailQuery.error.message
            : "Unable to load GRPO for editing."
          : null
      }
      topActions={
        !state.isEditMode && !state.draftDocNum ? (
          <CopyFromDropdown
            vendorCode={state.vendorCodeInput}
            vendorName={state.vendorNameInput}
            sourceDocTypes={
              activeSourceType
                ? [activeSourceType as "PurchaseQuotation" | "PurchaseOrder"]
                : ["PurchaseQuotation", "PurchaseOrder"]
            }
            onSelectSource={(sourceType) => {
              setCopyFromSourceType(sourceType as "PurchaseOrder" | "PurchaseQuotation");
              setCopyFromDialogOpen(true);
            }}
            onReset={
              committedDocNums.length > 0
                ? () => {
                    state.setProductRows([]);
                    state.setProductRowDrafts({});
                    state.setReferenceNo("");
                    state.setRemarks("");
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
      <LazyCopyFromDialog
        open={copyFromDialogOpen}
        onClose={() => {
          setCopyFromDialogOpen(false);
          setCopyFromSourceType(null);
        }}
        sourceDocType={copyFromSourceType ?? sourceDocType ?? "PurchaseOrder"}
        vendorCode={state.vendorCodeInput}
        vendorName={state.vendorNameInput}
        committedDocNums={committedDocNums}
        onSelectDocuments={handleCopyFromSelect}
      />
      <div className="grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
        <div
          onClickCapture={handleRestrictedClick?.("Vendor Info")}
          className={`h-full ${state.isEditMode ? "cursor-not-allowed" : ""}`}
        >
          <div className={`h-full ${state.isEditMode ? "pointer-events-none" : ""}`}>
            <VendorCustomerGrid
              loading={state.vendorsQuery.isLoading || isFormHydrating}
              error={
                state.vendorsQuery.isError
                  ? state.vendorsQuery.error instanceof Error
                    ? state.vendorsQuery.error.message
                    : "Unable to load vendors."
                  : null
              }
              nameInput={state.vendorNameInput}
              codeInput={state.vendorCodeInput}
              nameFocused={state.vendorNameFocused}
              codeFocused={state.vendorCodeFocused}
              nameSuggestions={state.vendorNameSuggestions}
              codeSuggestions={state.vendorCodeSuggestions}
              onNameChange={state.handleVendorNameChange}
              onCodeChange={state.handleVendorCodeChange}
              onNameFocus={() => state.setVendorNameFocused(true)}
              onCodeFocus={() => state.setVendorCodeFocused(true)}
              onNameBlur={() => setTimeout(() => state.setVendorNameFocused(false), 120)}
              onCodeBlur={() => setTimeout(() => state.setVendorCodeFocused(false), 120)}
              onOpenNamePopup={() => state.openPopup("vendor-name")}
              onOpenCodePopup={() => state.openPopup("vendor-code")}
              onSelectVendor={state.selectVendor}
              vendorNameInvalid={Boolean(state.fieldErrors.vendorName)}
              vendorCodeInvalid={Boolean(state.fieldErrors.vendorCode)}
              vendorNameErrorText={state.fieldErrors.vendorName}
              vendorCodeErrorText={state.fieldErrors.vendorCode}
              nameDisabled={state.isEditMode}
              codeDisabled={state.isEditMode}
              uniformReadOnlyAppearance={state.isEditMode}
            />
          </div>
        </div>

        <div
          onClickCapture={handleRestrictedClick?.("Warehouse & Logistics")}
          className={`h-full ${state.isEditMode ? "cursor-not-allowed" : ""}`}
        >
          <div className={`h-full ${state.isEditMode ? "pointer-events-none" : ""}`}>
            <LogisticsGrid
              salesEmployeeInput={state.buyerInput}
              salesEmployeesLoading={state.salesEmployeesQuery.isLoading || isFormHydrating}
              error={
                state.salesEmployeesQuery.isError || state.warehousesQuery.isError
                  ? "Unable to load logistics details."
                  : null
              }
              salesEmployeeFocused={state.buyerFocused}
              salesEmployeeSuggestions={state.buyerSuggestions}
              onSalesEmployeeChange={state.setBuyerInput}
              onSalesEmployeeFocus={() => state.setBuyerFocused(true)}
              onSalesEmployeeBlur={() => setTimeout(() => state.setBuyerFocused(false), 120)}
              onOpenSalesEmployeePopup={() => state.openPopup("sales-employee")}
              onSelectSalesEmployee={state.selectBuyer}
              salesEmployeeLabel="BUYER"
              salesEmployeePlaceholder="Select Buyer"
              salesEmployeeDisabled={state.isEditMode}
              uniformReadOnlyAppearance={state.isEditMode}
              showWarehouseInsteadOfDocNum={true}
              warehouseLabel="Warehouse"
              warehouseInput={state.warehouseInput}
              warehousesLoading={state.warehousesQuery.isLoading || isFormHydrating}
              warehouseFocused={state.warehouseFocused}
              warehouseSuggestions={state.warehouseSuggestions}
              onWarehouseChange={state.setWarehouseInput}
              onWarehouseFocus={() => state.setWarehouseFocused(true)}
              onWarehouseBlur={() => setTimeout(() => state.setWarehouseFocused(false), 120)}
              onOpenWarehousePopup={() => state.openPopup("warehouse")}
              onSelectWarehouse={state.selectWarehouse}
              warehouseInvalid={Boolean(state.fieldErrors.warehouseCode)}
              warehouseErrorText={state.fieldErrors.warehouseCode}
              warehouseDisabled={state.isEditMode}
              warehouseCode={state.effectiveWarehouseCode}
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
              branchDisabled={state.isEditMode || Boolean(state.branchDisabled)}
            />
          </div>
        </div>

        <DocumentDatesGrid
          docDate={state.docDate}
          docDueDate={state.docDueDate}
          loading={isFormHydrating}
          today={state.today}
          activeDatePicker={state.activeDatePicker}
          docDateContainerRef={state.docDateContainerRef}
          deliveryDateContainerRef={state.deliveryDateContainerRef}
          toDisplayDate={toDisplayDate}
          parseISODate={parseISODate}
          toISODate={toISODate}
          onSetActiveDatePicker={(value) => {
            if (!state.isEditMode) {
              state.setActiveDatePicker(value);
              return;
            }
            state.setActiveDatePicker((prev) => {
              const next = typeof value === "function" ? value(prev) : value;
              if (next === "doc") {
                state.showEditRestrictedToast("Document Date");
                return null;
              }
              return next;
            });
          }}
          onDocDateChange={state.handleDocDateChange}
          onDocDueDateChange={state.handleDocDueDateChange}
          docDateReadOnly={state.isEditMode}
          docDueDateReadOnly={state.isEditMode}
          uniformReadOnlyAppearance={state.isEditMode}
        />
      </div>

      <div className="mt-3 grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
        <div
          className={`h-full lg:col-span-2 ${state.isEditMode ? "cursor-not-allowed" : ""}`}
          onClickCapture={handleRestrictedClick?.("Address")}
        >
          <div className={`h-full ${state.isEditMode ? "pointer-events-none" : ""}`}>
            <AddressGrid
              className="h-full"
              loading={isFormHydrating}
              billToAddress={state.billToAddress}
              shipToAddress={state.shipToAddress}
              readOnly={state.isEditMode}
              uniformReadOnlyAppearance={state.isEditMode}
              billToOptions={billToOptions}
              shipToOptions={shipToOptions}
              onBillToAddressChange={state.setBillToAddress}
              onShipToAddressChange={state.setShipToAddress}
              billToLabel="Pay To Address"
            />
          </div>
        </div>

        <ReferenceGrid
          loading={isFormHydrating}
          referenceNo={state.referenceNo}
          comments={state.remarks}
          referenceNoDisabled={false}
          uniformReadOnlyAppearance={state.isEditMode}
          onReferenceNoDisabledClick={() => state.setReferenceNo(state.referenceNo)}
          onReferenceNoChange={state.setReferenceNo}
          onCommentsChange={state.setRemarks}
          referenceLabel="VENDOR REF NO"
        />
      </div>

      {/* Attachments Section Card */}
      <div className="mt-3">
        <SectionCard title="ATTACHMENTS">
          <UploadGrid
            attachments={state.attachments}
            onAttachmentsChange={state.setAttachments}
            moduleName="GRPO"
            readOnly={state.isClosed}
            loading={isFormHydrating}
          />
        </SectionCard>
      </div>

      <GRPOProductSection
        rows={state.rows}
        productRowDrafts={state.productRowDrafts}
        submitDisabled={state.submitDisabled}
        setProductRows={state.setProductRows}
        vendorCode={state.vendorCodeInput}
        vendorName={state.vendorNameInput}
        defaultWarehouseCode={state.effectiveWarehouseCode}
        createError={state.createError}
        createDisabledReason={state.createDisabledReason}
        missingSearchMandatoryFields={state.missingSearchMandatoryFields}
        searchRequiredCompletionPercent={state.searchRequiredCompletionPercent}
        searchMandatoryFields={state.searchMandatoryFields}
        missingMandatoryFields={state.missingMandatoryFields}
        requiredCompletionPercent={state.requiredCompletionPercent}
        requiredFieldsTotal={state.requiredFieldsTotal}
        requiredFieldLabelText={GRPO_FIELD_LABEL_TEXT}
        openProductPopup={state.openProductPopup}
        prefetchProducts={state.prefetchProducts}
        isSubmitting={state.createMutation.isPending || state.updateMutation.isPending}
        isEditMode={state.isEditMode}
        loading={isFormHydrating}
        onOpenLotPage={handleOpenLotPage}
        onUpdateProductRow={state.updateProductRow}
        onRemoveProductRow={state.removeProductRow}
        onSetProductRowDraft={state.setProductRowDraft}
        onClearProductRowDraft={state.clearProductRowDraft}
        onSubmit={state.handleCreateOrder}
        warehouses={state.warehouses}
        warehousesLoading={state.warehousesQuery.isLoading || isFormHydrating}
        onEditRestrictedClick={state.showEditRestrictedToast}
        headerDiscountPercent={state.headerDiscountPercent}
        secondaryActions={
          state.isEditMode && !state.isClosed ? (
            <CopyToDropdown
              docNum={docNum!}
              sourceDocType="GoodsReceiptPO"
              targets={["AP Invoice"]}
            />
          ) : null
        }
        warehouseErrors={state.warehouseErrors}
        onSubmitMode={state.handleCreateOrder}
        isSaved={state.isSaved}
        isDirty={state.isDirty}
        savedDocNum={state.savedDocNum}
        onDownload={useDocumentDownload(
          mode === "edit" ? docNum : state.savedDocNum,
          "grpos",
          "GRPO",
        )}
        onReset={state.resetForm}
        submitLoadingText={state.isEditMode ? "Updating..." : "Adding..."}
      />

      <GRPOModals state={state} />

      {state.pendingVendorChange && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink-900/30">
          <div className="w-full max-w-sm rounded-xl border border-linen-200 bg-surface p-5 shadow-lg">
            <h3 className="mb-2 text-sm font-semibold text-ink-900">Confirm Vendor Change</h3>
            <p className="mb-4 text-sm text-neutral-500">
              Changing vendor will affect copied document data. Continue?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={state.cancelVendorChange}
                className="rounded-full border border-linen-200 bg-surface px-4 py-1.5 text-xs font-medium text-ink-900 transition hover:bg-linen-50"
              >
                No
              </button>
              <button
                type="button"
                onClick={state.confirmVendorChange}
                className="rounded-full border border-teal-600 bg-teal-600 px-4 py-1.5 text-xs font-medium text-surface transition hover:bg-teal-700"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </CreatePageWrapper>
  );
}

export default GRPOCreate;
