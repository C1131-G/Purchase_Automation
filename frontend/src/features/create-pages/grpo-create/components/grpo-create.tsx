import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import type { MouseEvent } from "react";

import { AddressGrid } from "@/features/create-pages/create-shared/components/grids/address-grid";
import { DocumentDatesGrid } from "@/features/create-pages/create-shared/components/grids/document-dates-grid";
import { LogisticsGrid } from "@/features/create-pages/create-shared/components/grids/logistics-grid";
import { ReferenceGrid } from "@/features/create-pages/create-shared/components/grids/reference-grid";
import { VendorCustomerGrid } from "@/features/create-pages/create-shared/components/grids/vendor-customer-grid";
import { CopyFromDropdown } from "@/features/create-pages/create-shared/components/layout/copy-from-dropdown";
import { CopyToDropdown } from "@/features/create-pages/create-shared/components/layout/copy-to-dropdown";
import { CreatePageWrapper } from "@/features/create-pages/create-shared/components/layout/create-page-wrapper";
import { CopyFromDialog } from "@/features/create-pages/create-shared/components/modals/copy-from-dialog";

import {
  parseISODate,
  toDisplayDate,
  toISODate,
} from "@/features/create-pages/create-shared/utils/create-order.utils";
import { GRPOModals } from "@/features/create-pages/grpo-create/components/grpo-modals";
import { GRPOProductSection } from "@/features/create-pages/grpo-create/components/grpo-product-section";
import { useGRPOCreate } from "@/features/create-pages/grpo-create/hooks/use-grpo-create";
import { GRPO_FIELD_LABEL_TEXT } from "@/features/create-pages/grpo-create/utils/grpo-create.utils";

interface GRPOCreateProps {
  mode?: "create" | "edit";
  docNum?: string;
  sourceDocNum?: string | undefined;
  sourceDocType?: "PurchaseOrder" | "PurchaseQuotation" | undefined;
}

/**
 * GRPOCreate: Handles document logic for Goods Receipt PO.
 */
export function GRPOCreate({
  mode = "create",
  docNum,
  sourceDocNum,
  sourceDocType,
}: GRPOCreateProps) {
  const router = useRouter();
  const state = useGRPOCreate({
    docNum: docNum || "",
    mode,
    onCreateSuccess: () => {
      router.navigate({
        replace: true,
        search: {},
        to: "/purchase/create-grpo",
      });
    },
    sourceDocNum,
    sourceDocType,
  });

  const [copyFromDialogOpen, setCopyFromDialogOpen] = useState(false);
  const [copyFromSourceType, setCopyFromSourceType] = useState<
    "PurchaseOrder" | "PurchaseQuotation" | null
  >(null);

  const committedDocNums = sourceDocNum ? sourceDocNum.split(",").filter(Boolean) : [];
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
      docType: "PurchaseOrder" | "GoodsReceiptPO" | "APInvoice" | "PurchaseQuotation";
    }[],
  ) => {
    if (selected.length === 0) {
      return;
    }
    const docNums = selected.map((s) => s.docNum).join(",");
    const { docType } = selected[0]!;
    window.location.href = `/purchase/create-grpo?sourceDocNum=${encodeURIComponent(docNums)}&sourceDocType=${docType}`;
  };

  return (
    <CreatePageWrapper
      rootLabel="Purchase"
      breadcrumbParent={{
        label: "GRPO",
        to: "/purchase/grpo",
      }}
      pageTitle={state.isEditMode ? `Update GRPO ${docNum}` : "Create GRPO"}
      editError={
        state.isEditMode && state.editDetailQuery.isError
          ? state.editDetailQuery.error instanceof Error
            ? state.editDetailQuery.error.message
            : "Unable to load GRPO for editing."
          : null
      }
      topActions={
        !state.isEditMode ? (
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
          />
        ) : null
      }
    >
      <CopyFromDialog
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
              onBillToAddressChange={state.setBillToAddress}
              onShipToAddressChange={state.setShipToAddress}
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

      <GRPOProductSection
        rows={state.rows}
        productRowDrafts={state.productRowDrafts}
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
        isSubmitting={
          state.isEditMode ? state.updateMutation.isPending : state.createMutation.isPending
        }
        isEditMode={state.isEditMode}
        loading={isFormHydrating}
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
      />

      <GRPOModals state={state} />

      {state.pendingVendorChange && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30">
          <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-lg">
            <h3 className="mb-2 text-sm font-semibold text-zinc-900">Confirm Vendor Change</h3>
            <p className="mb-4 text-sm text-zinc-600">
              Changing vendor will affect copied document data. Continue?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={state.cancelVendorChange}
                className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                No
              </button>
              <button
                type="button"
                onClick={state.confirmVendorChange}
                className="rounded-full border border-blue-600 bg-blue-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
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
