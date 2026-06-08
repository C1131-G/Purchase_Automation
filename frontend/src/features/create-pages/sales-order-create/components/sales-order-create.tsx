import { useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { goeyToast } from "goey-toast";
import { ChevronDown, ClipboardList } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";

import { AddressGrid } from "@/features/create-pages/create-shared/components/grids/address-grid";
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
import { PullFromSQModal } from "@/features/create-pages/ar-invoice-create/components/pull-from-sq-modal";
import { SalesOrderModals } from "@/features/create-pages/sales-order-create/components/sales-order-modals";
import { SalesOrderProductSection } from "@/features/create-pages/sales-order-create/components/sales-order-product-section";
import { useSalesOrderCreate } from "@/features/create-pages/sales-order-create/hooks/use-sales-order-create";
import { salesOrderQueries } from "@/features/table-pages/sales-orders/api/sales-order.queries";

interface SalesOrderCreateProps {
  mode?: "create" | "edit";
  docNum?: string;
}

/**
 * SalesOrderCreate: Orchestrator for the complex SO creation multi-step flow.
 * State is centralized in useSalesOrderCreate to keep the UI declarative and clean.
 * Leverages CreatePageWrapper for consistent entity layout.
 */
export function SalesOrderCreate({ mode = "create", docNum }: SalesOrderCreateProps) {
  const queryClient = useQueryClient();
  const search = useSearch({ strict: false });
  const sourceDocNum =
    mode === "create" ? (search as Record<string, string | undefined>).sourceDocNum : undefined;
  const sourceDocType =
    mode === "create" ? (search as Record<string, string | undefined>).sourceDocType : undefined;

  const state = useSalesOrderCreate(
    docNum ? { docNum, mode } : { mode, sourceDocNum, sourceDocType },
  );

  const [copyFromOpen, setCopyFromOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: Event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setCopyFromOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const pageTitle = state.isEditMode ? "Update Sales Order" : "Create Sales Order";
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
        state.showEditRestrictedToast("Customer Info");
      }
    : undefined;

  return (
    <div
      onClickCapture={() => goeyToast.dismiss()}
      onKeyDownCapture={() => goeyToast.dismiss()}
      className="contents"
    >
      <CreatePageWrapper
        rootLabel="Sales"
        breadcrumbParent={{
          label: "Sales Orders Data Table",
          onMouseEnter: () =>
            void queryClient.prefetchQuery(salesOrderQueries.list({ limit: 10, page: 1 })),
          to: "/sales/orders",
        }}
        pageTitle={pageTitle}
        editError={
          state.isEditMode && state.editDetailQuery.isError
            ? state.editDetailQuery.error instanceof Error
              ? state.editDetailQuery.error.message
              : "Unable to load sales order for editing."
            : null
        }
      >
        <div className="mb-4 flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <h1 className="text-2xl font-bold text-zinc-900 whitespace-nowrap mb-1">{pageTitle}</h1>
          <div className="flex items-center justify-end gap-4 flex-1 xl:-mt-6">
            {state.trackerDocType && state.trackerDocEntry && (
              <div className="relative z-10 overflow-x-auto max-w-full">
                <RelationshipMapTracker
                  docType={state.trackerDocType as any}
                  docEntry={state.trackerDocEntry}
                  compact={true}
                />
              </div>
            )}
            {!state.isEditMode && (
              <div className="relative shrink-0" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setCopyFromOpen(!copyFromOpen)}
                  disabled={!state.codeInput.trim()}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-blue-200 active:scale-95 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none disabled:cursor-not-allowed group"
                >
                  <span>Copy from</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${copyFromOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {copyFromOpen && (
                  <div className="absolute right-0 top-full z-[60] mt-2 w-56 origin-top-right overflow-hidden rounded-2xl border border-zinc-100 bg-white p-1.5 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in duration-150">
                    <button
                      onClick={() => {
                        state.setPullFromSQModalOpen(true);
                        setCopyFromOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 hover:text-orange-600"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                        <ClipboardList className="h-4.5 w-4.5" />
                      </div>
                      <span>Sales Quotations</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

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
              />
            </div>
          </div>

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
            onSalesEmployeeBlur={() => setTimeout(() => state.setSalesEmployeeFocused(false), 120)}
            onOpenSalesEmployeePopup={() => state.openPopup("sales-employee")}
            onSelectSalesEmployee={state.selectSalesEmployee}
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
          />

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
          />
        </div>

        <div className="mt-3 grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
          <AddressGrid
            loading={isFormHydrating}
            billToAddress={state.billToAddress}
            shipToAddress={state.shipToAddress}
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
          <ReferenceGrid
            loading={isFormHydrating}
            referenceNo={state.header.referenceNo}
            comments={state.header.comments}
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

        <SalesOrderProductSection
          sectionId="sales-order-product-section"
          missingSearchMandatoryFields={state.missingSearchMandatoryFields}
          searchRequiredCompletionPercent={state.searchRequiredCompletionPercent}
          searchMandatoryFields={state.searchMandatoryFields}
          openProductPopup={state.openProductPopup}
          prefetchProducts={state.prefetchProducts}
          productRows={state.productRows}
          productRowDrafts={state.productRowDrafts}
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
          createSalesOrderMutation={state.createSalesOrderMutation}
          missingMandatoryFields={state.missingMandatoryFields}
          requiredCompletionPercent={state.requiredCompletionPercent}
          handleCreateOrder={state.handleCreateOrder}
          submitLabel={state.isEditMode ? "Update" : "Create"}
          submitLoadingText={state.isEditMode ? "Updating..." : "Creating..."}
          secondaryActions={
            state.isEditMode && docNum ? (
              <CopyToDropdown
                docNum={docNum}
                sourceDocType="SalesOrder"
                targets={["A/R Invoice"]}
              />
            ) : null
          }
        />
        <SalesOrderModals state={state} />

        {!state.isEditMode && (
          <PullFromSQModal
            open={state.pullFromSQModalOpen}
            onClose={() => state.setPullFromSQModalOpen(false)}
            cardCode={state.codeInput}
            onConfirm={state.addProductsFromSQs}
          />
        )}
      </CreatePageWrapper>
    </div>
  );
}
