import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { goeyToast } from "goey-toast";
import type { MouseEvent } from "react";

import { useDocumentDownload } from "@/features/create-pages/create-shared/hooks/use-document-download";
import { AddressGrid } from "@/features/create-pages/create-shared/components/grids/address-grid";
import { UploadGrid } from "@/features/create-pages/create-shared/components/grids/upload-grid";
import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";
import { DocumentDatesGrid } from "@/features/create-pages/create-shared/components/grids/document-dates-grid";
import { LogisticsGrid } from "@/features/create-pages/create-shared/components/grids/logistics-grid";
import { ReferenceGrid } from "@/features/create-pages/create-shared/components/grids/reference-grid";
import { VendorCustomerGrid } from "@/features/create-pages/create-shared/components/grids/vendor-customer-grid";
import { CopyToDropdown } from "@/features/create-pages/create-shared/components/layout/copy-to-dropdown";
import { CreatePageWrapper } from "@/features/create-pages/create-shared/components/layout/create-page-wrapper";
import {
  parseISODate,
  toDisplayDate,
  toISODate,
} from "@/features/create-pages/create-shared/utils/create-order.utils";
import { RelationshipMapTracker } from "@/features/create-shared/components/layout/relationship-map-tracker";
import { PurchaseQuotationModals } from "@/features/create-pages/purchase-quotation-create/components/purchase-quotation-modals";
import { PurchaseQuotationProductSection } from "@/features/create-pages/purchase-quotation-create/components/purchase-quotation-product-section";
import { usePurchaseQuotationCreate } from "@/features/create-pages/purchase-quotation-create/hooks/use-purchase-quotation-create";
import { purchaseQuotationQueries } from "@/features/table-pages/purchase-quotations/api/purchase-quotation.queries";

interface PurchaseQuotationCreateProps {
  mode?: "create" | "edit";
  docNum?: string;
}

/**
 * PurchaseQuotationCreate: Orchestrator for the complex PQ creation multi-step flow.
 * State is centralized in usePurchaseQuotationCreate to keep the UI declarative and clean.
 * Leverages CreatePageWrapper for consistent entity layout.
 */
export function PurchaseQuotationCreate({ mode = "create", docNum }: PurchaseQuotationCreateProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const state = usePurchaseQuotationCreate(
    docNum
      ? {
          docNum,
          mode,
        }
      : {
          mode,
          onCreateSuccess: () => {},
        },
  );

  const pageTitle = state.isEditMode
    ? `Update Purchase Quotation ${docNum}`
    : "Create Purchase Quotation";
  const isFormHydrating = !state.isEditMode
    ? state.vendorsQuery.isLoading &&
      state.warehousesQuery.isLoading &&
      state.salesEmployeesQuery.isLoading &&
      !state.vendorsQuery.data
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
    ? activeVendor.addresses.map((addr: any) => ({
        addressName: addr.addressName,
        addressText: addr.addressText,
        addressType: addr.addressType,
      }))
    : [];
  const shipToOptions = activeVendor?.addresses
    ? activeVendor.addresses.map((addr: any) => ({
        addressName: addr.addressName,
        addressText: addr.addressText,
        addressType: addr.addressType,
      }))
    : [];

  return (
    <div
      onClickCapture={() => goeyToast.dismiss()}
      onKeyDownCapture={() => goeyToast.dismiss()}
      className="contents"
    >
      <CreatePageWrapper
        dashboardName="Purchase Dashboard"
        dashboardUrl="/dashboard/purchase"
        breadcrumbParent={{
          label: "Purchase Quotations Data Table",
          onMouseEnter: () =>
            void queryClient.prefetchQuery(purchaseQuotationQueries.list({ limit: 10, page: 1 })),
          to: "/purchase/quotations",
        }}
        pageTitle={pageTitle}
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
            docDueDateInvalid={Boolean(state.productSearchFieldErrors.docDueDate)}
            docDueDateErrorText={state.productSearchFieldErrors.docDueDate}
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
          warehouses={state.warehouses}
          warehousesLoading={state.warehousesQuery.isLoading}
          uoms={state.uoms}
          updateProductRow={state.updateProductRow}
          removeProductRow={state.removeProductRow}
          setProductRowDraft={state.setProductRowDraft}
          clearProductRowDraft={state.clearProductRowDraft}
          totals={state.totals}
          summaryCurrencyLabel={state.summaryCurrencyLabel}
          createError={state.createError}
          createDisabledReason={state.createDisabledReason}
          createPurchaseQuotationMutation={state.createPurchaseQuotationMutation}
          missingMandatoryFields={state.missingMandatoryFields}
          requiredCompletionPercent={state.requiredCompletionPercent}
          handleCreateOrder={state.handleCreateOrder}
          onSubmitMode={state.handleCreateOrder}
          isSaved={state.isSaved}
          savedDocNum={state.savedDocNum}
          onDownload={useDocumentDownload(
            state.isEditMode ? docNum : state.savedDocNum,
            "purchase-quotations",
            "Purchase_Quotation",
          )}
          onReset={() => {
            state.resetForm();
            window.scrollTo({ behavior: "smooth", top: 0 });
            void router.navigate({
              replace: true,
              search: {},
              to: "/purchase/create-quotation",
              viewTransition: true,
            });
          }}
          isEditMode={state.isEditMode}
          isClosed={state.isClosed}
          allowSearchInEditMode={state.isEditMode}
          submitLabel={state.isEditMode ? "Update" : "Create"}
          submitLoadingText={state.isEditMode ? "Updating..." : "Adding..."}
          secondaryActions={
            state.isEditMode && !state.isClosed && docNum ? (
              <CopyToDropdown
                docNum={docNum}
                sourceDocType="PurchaseQuotation"
                targets={["PO", "GRPO", "AP Invoice"]}
              />
            ) : null
          }
          warehouseErrors={state.warehouseErrors}
          submitDisabled={state.submitDisabled}
        />
        <PurchaseQuotationModals state={state} />
      </CreatePageWrapper>
    </div>
  );
}
