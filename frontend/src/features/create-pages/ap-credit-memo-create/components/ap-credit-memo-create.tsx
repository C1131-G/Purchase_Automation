import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import type { MouseEvent } from "react";

import { useDocumentDownload } from "@/features/create-pages/create-shared/hooks/use-document-download";
import { usePartnerAddressOptions } from "@/features/create-pages/create-shared/hooks/use-partner-address-options";

import { APCreditMemoModals } from "@/features/create-pages/ap-credit-memo-create/components/ap-credit-memo-modals";
import { APCreditMemoProductSection } from "@/features/create-pages/ap-credit-memo-create/components/ap-credit-memo-product-section";
import { useAPCreditMemoCreate } from "@/features/create-pages/ap-credit-memo-create/hooks/use-ap-credit-memo-create";
import { AP_CREDIT_MEMO_FIELD_LABEL_TEXT } from "@/features/create-pages/ap-credit-memo-create/utils/ap-credit-memo-create.utils";
import { AddressGrid } from "@/features/create-pages/create-shared/components/grids/address-grid";
import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";
import { UploadGrid } from "@/features/create-pages/create-shared/components/grids/upload-grid";
import { DocumentDatesGrid } from "@/features/create-pages/create-shared/components/grids/document-dates-grid";
import { LogisticsGrid } from "@/features/create-pages/create-shared/components/grids/logistics-grid";
import { ReferenceGrid } from "@/features/create-pages/create-shared/components/grids/reference-grid";
import { VendorCustomerGrid } from "@/features/create-pages/create-shared/components/grids/vendor-customer-grid";
import { CopyFromDropdown } from "@/features/create-pages/create-shared/components/layout/copy-from-dropdown";
import type { SourceDocType } from "@/features/create-pages/create-shared/components/layout/copy-from-dropdown";
import { CreatePageWrapper } from "@/features/create-pages/create-shared/components/layout/create-page-wrapper";
import { LazyCopyFromDialog } from "@/features/create-pages/create-shared/components/modals/lazy-copy-from-dialog";
import {
  parseISODate,
  toDisplayDate,
  toISODate,
} from "@/features/create-pages/create-shared/utils/create-order.utils";
import { RelationshipMapTracker } from "@/features/create-shared/components/layout/relationship-map-tracker";

interface APCreditMemoCreateProps {
  mode?: "create" | "edit";
  docNum?: string;
  sourceDocNum?: string | undefined;
  sourceDocType?: "APInvoice" | undefined;
  draftDocNum?: string | undefined;
  draftDocEntry?: string | undefined;
}

type CopyFromSourceType = "APInvoice";

export function APCreditMemoCreate({
  mode = "create",
  docNum,
  sourceDocNum,
  sourceDocType,
  draftDocNum,
  draftDocEntry,
}: APCreditMemoCreateProps) {
  const router = useRouter();
  const [copyFromDialogOpen, setCopyFromDialogOpen] = useState(false);
  const [copyFromSourceType, setCopyFromSourceType] = useState<CopyFromSourceType | null>(null);
  const [sourceCleared, setSourceCleared] = useState(false);

  const state = useAPCreditMemoCreate({
    docNum: docNum || "",
    mode,
    draftDocNum: draftDocNum || "",
    draftDocEntry: draftDocEntry || "",
    onCreateSuccess: () => {
      setSourceCleared(false);
    },
    sourceDocNum,
    sourceDocType,
  });

  const isFormHydrating =
    (mode === "edit" && !!docNum && !state.isEditHydrated) || state.isSourceHydrating;

  const committedDocNums =
    !sourceCleared && sourceDocNum ? sourceDocNum.split(",").filter(Boolean) : [];

  const handleRestrictedClick =
    (fieldName: string, forceLock = false) =>
    (event: MouseEvent<HTMLDivElement> | undefined) => {
      const isLocked = forceLock ? state.isEditMode : state.isClosed;
      if (isLocked) {
        event?.preventDefault();
        event?.stopPropagation();
        state.showEditRestrictedToast(fieldName);
      }
    };

  const handleCopyFromSelect = (selected: { docNum: string; docType: SourceDocType }[]) => {
    setSourceCleared(false);
    if (selected.length === 0) {
      return;
    }
    const docNums = selected.map((s) => s.docNum).join(",");
    const docType = selected[0]!.docType as "APInvoice";
    void router.navigate({
      to: "/purchase/create-ap-credit-memo",
      search: {
        sourceDocNum: docNums,
        sourceDocType: docType,
      },
    });
  };

  const { billToOptions, shipToOptions } = usePartnerAddressOptions(state.vendorCodeInput);

  const pageTitle = state.isEditMode
    ? `Update A/P Credit Memo ${docNum || ""}`
    : draftDocNum
      ? `Create A/P Credit Memo (Draft ${draftDocNum}${draftDocEntry ? ` #${draftDocEntry}` : ""})`
      : "Create A/P Credit Memo";

  return (
    <CreatePageWrapper
      dashboardName="Purchase Dashboard"
      dashboardUrl="/dashboard"
      breadcrumbParent={{
        label: "A/P Credit Memos Data Table",
        to: "/purchase/ap-credit-memo",
      }}
      pageTitle={pageTitle}
      editError={
        state.isEditMode && state.editDetailQuery.isError
          ? state.editDetailQuery.error instanceof Error
            ? state.editDetailQuery.error.message
            : "Unable to load credit memo for editing."
          : null
      }
      topActions={
        !state.isEditMode && !draftDocNum ? (
          <CopyFromDropdown
            vendorCode={state.vendorCodeInput}
            vendorName={state.vendorNameInput}
            sourceDocTypes={["APInvoice"]}
            onSelectSource={(type) => {
              setCopyFromSourceType(type as CopyFromSourceType);
              setCopyFromDialogOpen(true);
            }}
            onReset={
              committedDocNums.length > 0
                ? () => {
                    state.clearLines();
                    state.clearProductRowDrafts();
                    state.setReferenceNo("");
                    state.setRemarks("");
                    state.resetWarehouse();
                    setSourceCleared(true);
                  }
                : undefined
            }
          />
        ) : undefined
      }
    >
      {state.trackerDocType && state.trackerDocEntry && !draftDocNum && (
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
        sourceDocType={copyFromSourceType ?? "APInvoice"}
        vendorCode={state.vendorCodeInput}
        vendorName={state.vendorNameInput}
        includeClosed={true}
        committedDocNums={committedDocNums}
        onSelectDocuments={handleCopyFromSelect}
      />
      <div className="grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
        <div
          onClickCapture={handleRestrictedClick?.("Vendor Info", true)}
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
              {...state.seriesGridProps}
              seriesDisabled={state.isEditMode || state.seriesDisabled}
              {...(state.isEditMode
                ? {}
                : {
                    onOpenSeriesPopup: () => state.openPopup("series"),
                    onSelectSeries: state.selectSeries,
                  })}
              uniformReadOnlyAppearance={state.isEditMode}
            />
          </div>
        </div>

        <div
          onClickCapture={handleRestrictedClick?.("Warehouse & Logistics", true)}
          className={`h-full ${state.isEditMode ? "cursor-not-allowed" : ""}`}
        >
          <div className={`h-full ${state.isEditMode ? "pointer-events-none" : ""}`}>
            <LogisticsGrid
              salesEmployeeInput={state.buyerInput}
              salesEmployeesLoading={state.salesEmployeesQuery.isLoading || isFormHydrating}
              salesEmployeeFocused={state.buyerFocused}
              salesEmployeeSuggestions={state.buyerSuggestions}
              onSalesEmployeeChange={state.setBuyerInput}
              onSalesEmployeeFocus={() => state.setBuyerFocused(true)}
              onSalesEmployeeBlur={() => setTimeout(() => state.setBuyerFocused(false), 120)}
              onOpenSalesEmployeePopup={() => state.openPopup("sales-employee")}
              onSelectSalesEmployee={state.selectSalesEmployee}
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
          onClickCapture={handleRestrictedClick?.("Address", true)}
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
          uniformReadOnlyAppearance={state.isEditMode}
          onReferenceNoChange={state.setReferenceNo}
          onCommentsChange={state.setRemarks}
          referenceNoInvalid={Boolean(state.fieldErrors.referenceNo)}
          commentsInvalid={Boolean(state.fieldErrors.comments)}
          referenceNoErrorText={state.fieldErrors.referenceNo}
          commentsErrorText={state.fieldErrors.comments}
          referenceLabel="VENDOR REF NO"
        />
      </div>

      {/* Attachments Section Card */}
      <div className="mt-3">
        <SectionCard title="ATTACHMENTS">
          <UploadGrid
            attachments={state.attachments}
            onAttachmentsChange={state.setAttachments}
            moduleName="APCreditMemo"
            readOnly={state.isClosed}
            loading={isFormHydrating}
          />
        </SectionCard>
      </div>

      <APCreditMemoProductSection
        rows={state.rows}
        productRowDrafts={state.productRowDrafts}
        submitDisabled={state.submitDisabled}
        isDirty={state.isDirty}
        setProductRows={state.setProductRows}
        vendorCode={state.vendorCodeInput}
        vendorName={state.vendorNameInput}
        defaultWarehouseCode={state.warehouseCode}
        createError={state.createError}
        createDisabledReason={state.createDisabledReason}
        missingSearchMandatoryFields={state.missingSearchMandatoryFields}
        searchRequiredCompletionPercent={state.searchRequiredCompletionPercent}
        searchMandatoryFields={state.searchMandatoryFields}
        missingMandatoryFields={state.missingMandatoryFields}
        requiredCompletionPercent={state.requiredCompletionPercent}
        requiredFieldsTotal={state.requiredFieldsTotal}
        requiredFieldLabelText={AP_CREDIT_MEMO_FIELD_LABEL_TEXT}
        openProductPopup={state.openProductPopup}
        prefetchProducts={state.prefetchProducts}
        isSubmitting={state.createMutation.isPending || state.updateMutation.isPending}
        isEditMode={state.isEditMode}
        onUpdateProductRow={state.updateProductRow}
        onRemoveProductRow={state.removeProductRow}
        onSetProductRowDraft={state.setProductRowDraft}
        onClearProductRowDraft={state.clearProductRowDraft}
        onSubmit={state.handleCreateOrder}
        onSubmitMode={state.handleCreateOrder}
        isSaved={state.isSaved}
        savedDocNum={state.savedDocNum}
        onReset={state.resetForm}
        onDownload={useDocumentDownload(
          mode === "edit" ? docNum : state.savedDocNum,
          "ap-credit-memos",
          "AP_Credit_Memo",
        )}
        submitLoadingText={state.isEditMode ? "Updating..." : "Adding..."}
        warehouses={state.warehouses}
        warehousesLoading={state.warehousesQuery.isLoading || isFormHydrating}
        onEditRestrictedClick={state.showEditRestrictedToast}
        isClosed={state.isClosed}
        headerDiscountPercent={state.headerDiscountPercent}
        warehouseErrors={state.warehouseErrors}
      />

      <APCreditMemoModals state={state} />

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

export default APCreditMemoCreate;
