import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearch } from "@tanstack/react-router";
import { goeyToast } from "goey-toast";
import { useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";

import { ARInvoiceProductSection } from "@/features/create-pages/ar-invoice-create/components/ar-invoice-product-section";
import {
  CopyFromDialog,
  type SourceDocType,
} from "@/features/create-pages/create-shared/components/modals/copy-from-dialog";
import { pageLoadingToast } from "@/features/create-pages/create-shared/utils/page-loading-toast";
import { salesOrderAPI } from "@/features/table-pages/sales-orders/api/sales-order.service";
import { salesQuotationAPI } from "@/features/table-pages/sales-quotations/api/sales-quotation.service";
import { useARInvoiceCreate } from "@/features/create-pages/ar-invoice-create/hooks/use-ar-invoice-create";
import { AddressGrid } from "@/features/create-pages/create-shared/components/grids/address-grid";
import { DocumentDatesGrid } from "@/features/create-pages/create-shared/components/grids/document-dates-grid";
import { LogisticsGrid } from "@/features/create-pages/create-shared/components/grids/logistics-grid";
import { ReferenceGrid } from "@/features/create-pages/create-shared/components/grids/reference-grid";
import { VendorCustomerGrid } from "@/features/create-pages/create-shared/components/grids/vendor-customer-grid";
import { CopyFromDropdown } from "@/features/create-pages/create-shared/components/layout/copy-from-dropdown";
import { CopyToDropdown } from "@/features/create-pages/create-shared/components/layout/copy-to-dropdown";
import { CreatePageWrapper } from "@/features/create-pages/create-shared/components/layout/create-page-wrapper";
import { RelationshipMapTracker } from "@/features/create-shared/components/layout/relationship-map-tracker";
import { SharedCreateModals } from "@/features/create-pages/create-shared/components/modals/shared-create-modals";
import {
  parseISODate,
  toDisplayDate,
  toISODate,
} from "@/features/create-pages/create-shared/utils/create-order.utils";
import { arInvoiceQueries } from "@/features/table-pages/ar-invoices/api/ar-invoice.queries";

interface ARInvoiceCreateProps {
  mode?: "create" | "edit";
  docNum?: string;
}

/**
 * ARInvoiceCreate: Orchestrator for the complex A/R Invoice creation flow.
 * State is managed by useARInvoiceCreate for a clean, declarative UI.
 * Leverages CreatePageWrapper for consistent entity layout.
 */
export function ARInvoiceCreate({ mode = "create", docNum }: ARInvoiceCreateProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const search = useSearch({ strict: false });
  const sourceDocNum = mode === "create" ? search.sourceDocNum : undefined;
  const rawSourceDocType = mode === "create" ? search.sourceDocType : undefined;
  const sourceDocType =
    rawSourceDocType === "SalesQuotation" || rawSourceDocType === "SalesOrder"
      ? rawSourceDocType
      : undefined;

  const [sourceCleared, setSourceCleared] = useState(false);

  useEffect(() => {
    setSourceCleared(false);
  }, [sourceDocNum, sourceDocType]);

  const state = useARInvoiceCreate(
    docNum
      ? { docNum, mode }
      : {
          mode,
          sourceDocNum: !sourceCleared ? sourceDocNum : undefined,
          sourceDocType: !sourceCleared ? sourceDocType : undefined,
        },
  );

  // Derive which SO / SQ doc numbers are already represented in productRows so the
  // pull modals can mark them pre-checked and non-selectable (prevents duplicate pulls).
  const committedSODocNums = useMemo(() => {
    const nums = new Set<number>();
    for (const row of state.productRows) {
      if (row.baseType === 17) {
        if (row.comment) {
          const match = /Based on SO (\d+)/.exec(row.comment);
          if (match?.[1]) nums.add(Number(match[1]));
        }
      }
    }
    if (
      !sourceCleared &&
      state.productRows.some((r) => r.baseType === 17) &&
      sourceDocType === "SalesOrder"
    ) {
      const urlDocNum = Number(sourceDocNum);
      if (urlDocNum && !isNaN(urlDocNum)) {
        nums.add(urlDocNum);
      }
    }
    return [...nums];
  }, [state.productRows, sourceDocNum, sourceDocType, sourceCleared]);

  const committedSQDocNums = useMemo(() => {
    const nums = new Set<number>();
    for (const row of state.productRows) {
      if (row.baseType === 23) {
        if (row.comment) {
          const match = /Based on SQ (\d+)/.exec(row.comment);
          if (match?.[1]) nums.add(Number(match[1]));
        }
      }
    }
    if (
      !sourceCleared &&
      state.productRows.some((r) => r.baseType === 23) &&
      sourceDocType === "SalesQuotation"
    ) {
      const urlDocNum = Number(sourceDocNum);
      if (urlDocNum && !isNaN(urlDocNum)) {
        nums.add(urlDocNum);
      }
    }
    return [...nums];
  }, [state.productRows, sourceDocNum, sourceDocType, sourceCleared]);

  const activeSourceType = useMemo<"SalesQuotation" | "SalesOrder" | null>(() => {
    const hasSORows = state.productRows.some((r) => r.baseType === 17);
    const hasSQRows = state.productRows.some((r) => r.baseType === 23);
    if (hasSORows) return "SalesOrder";
    if (hasSQRows) return "SalesQuotation";
    if (!sourceCleared && sourceDocType) {
      return sourceDocType;
    }
    return null;
  }, [state.productRows, sourceCleared, sourceDocType]);

  const hasCopiedRows = committedSODocNums.length > 0 || committedSQDocNums.length > 0;

  const handleReset = () => {
    state.setProductRows([]);
    state.setProductRowDrafts({});
    state.setHeader({ comments: "", referenceNo: "" });
    state.resetWarehouse();
    setSourceCleared(true);
  };

  const handleCopyFromSOSelect = async (selected: { docNum: string; docType: SourceDocType }[]) => {
    state.setPullFromSOModalOpen(false);
    if (selected.length === 0) return;

    const loadingToast = pageLoadingToast("A/R Invoice", "create");
    try {
      const details = await Promise.all(
        selected.map(async (doc) => {
          const res = await salesOrderAPI.getSalesOrderByDocNum(doc.docNum);
          return res.data;
        }),
      );

      const lines = details.flatMap((d) => {
        const docLines = d.DocumentLines ?? [];
        return docLines
          .filter((line) => {
            const openQty = line.RemainingOpenQuantity ?? line.Quantity ?? 0;
            return openQty > 0;
          })
          .map((line) => ({
            ...line,
            DocEntry: d.DocEntry ?? d.id,
            DocNum: d.DocNum,
            DocDate: d.DocDate,
            DocCurr: d.DocCurr,
            OpenQty: line.RemainingOpenQuantity ?? line.Quantity ?? 0,
          }));
      });

      const allSelectedDocNums = selected.map((s) => Number(s.docNum));
      await state.addProductsFromSOs(lines as any, allSelectedDocNums);
      loadingToast.dismiss();
      goeyToast.success("Products added successfully");
    } catch (err) {
      console.error(err);
      loadingToast.dismiss();
      goeyToast.error("Failed to pull products");
    }
  };

  const handleCopyFromSQSelect = async (selected: { docNum: string; docType: SourceDocType }[]) => {
    state.setPullFromSQModalOpen(false);
    if (selected.length === 0) return;

    const loadingToast = pageLoadingToast("A/R Invoice", "create");
    try {
      const details = await Promise.all(
        selected.map(async (doc) => {
          const res = await salesQuotationAPI.getSalesQuotationByDocNum(doc.docNum);
          return res.data;
        }),
      );

      const lines = details.flatMap((d) => {
        const docLines = d.DocumentLines ?? [];
        return docLines
          .filter((line) => {
            const openQty = line.RemainingOpenQuantity ?? line.Quantity ?? 0;
            return openQty > 0;
          })
          .map((line) => ({
            ...line,
            DocEntry: d.DocEntry ?? d.id,
            DocNum: d.DocNum,
            DocDate: d.DocDate,
            DocCurr: d.DocCurr,
            OpenQty: line.RemainingOpenQuantity ?? line.Quantity ?? 0,
          }));
      });

      const allSelectedDocNums = selected.map((s) => Number(s.docNum));
      await state.addProductsFromSQs(lines as any, allSelectedDocNums);
      loadingToast.dismiss();
      goeyToast.success("Products added successfully");
    } catch (err) {
      console.error(err);
      loadingToast.dismiss();
      goeyToast.error("Failed to pull products");
    }
  };

  const pageTitle = state.isEditMode ? "Update A/R Invoice" : "Create A/R Invoice";
  const isFormHydrating = !state.isEditMode
    ? state.vendorsQuery.isLoading &&
      state.warehousesQuery.isLoading &&
      state.salesEmployeesQuery.isLoading &&
      !state.vendorsQuery.data
    : (state.editDetailQuery.isLoading && !state.editDetailQuery.data) || !state.isEditHydrated;

  const handleCustomerRestrictedClick = state.isEditMode
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
          label: "A/R Invoice Data Table",
          onMouseEnter: () =>
            void queryClient.prefetchQuery(arInvoiceQueries.list({ limit: 10, page: 1 })),
          to: "/sales/ar-invoice",
        }}
        pageTitle={pageTitle}
        editError={
          state.isEditMode && state.editDetailQuery.isError
            ? state.editDetailQuery.error instanceof Error
              ? state.editDetailQuery.error.message
              : "Unable to load A/R invoice for editing."
            : null
        }
        topActions={
          !state.isEditMode ? (
            <CopyFromDropdown
              vendorCode={state.codeInput}
              vendorName={state.nameInput}
              sourceDocTypes={
                activeSourceType ? [activeSourceType] : ["SalesQuotation", "SalesOrder"]
              }
              onSelectSource={(source) => {
                if (source === "SalesOrder") {
                  state.setPullFromSOModalOpen(true);
                } else if (source === "SalesQuotation") {
                  state.setPullFromSQModalOpen(true);
                }
              }}
              onReset={hasCopiedRows ? handleReset : undefined}
            />
          ) : null
        }
      >
        {state.trackerDocType && state.trackerDocEntry && (
          <div className="mb-4 flex flex-col xl:flex-row xl:items-end justify-between gap-4">
            <div className="flex items-center justify-end gap-4 flex-1 xl:-mt-6">
              <div className="relative z-10 overflow-x-auto max-w-full">
                <RelationshipMapTracker
                  docType={state.trackerDocType as any}
                  docEntry={state.trackerDocEntry}
                  compact={true}
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
          <div
            onClickCapture={handleCustomerRestrictedClick}
            className={`h-full ${state.isEditMode ? "cursor-not-allowed" : ""}`}
          >
            <div className={`h-full ${state.isEditMode ? "pointer-events-none" : ""}`}>
              <VendorCustomerGrid
                loading={state.vendorsQuery.isLoading || isFormHydrating}
                error={
                  state.vendorsQuery.isError
                    ? state.vendorsQuery.error instanceof Error
                      ? state.vendorsQuery.error.message
                      : "Unable to load customers."
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
            salesEmployeeDisabled={state.isEditMode}
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
            warehouseDisabled={state.isEditMode}
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
            onDocDateChange={state.setDocDate}
            onDocDueDateChange={state.setDocDueDate}
            docDateReadOnly={state.isEditMode}
            docDueDateReadOnly={false}
          />
        </div>

        <div className="mt-3 grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
          <AddressGrid
            loading={isFormHydrating}
            billToAddress={state.billToAddress}
            shipToAddress={state.shipToAddress}
            readOnly={state.isEditMode}
            onBillToAddressChange={state.setBillToAddress}
            onShipToAddressChange={state.setShipToAddress}
          />
          <ReferenceGrid
            loading={isFormHydrating}
            referenceNo={state.header.referenceNo}
            comments={state.header.comments}
            referenceNoDisabled={false}
            onReferenceNoChange={(value) => state.setHeader({ referenceNo: value })}
            onCommentsChange={(value) => state.setHeader({ comments: value })}
            referenceNoInvalid={Boolean(state.productSearchFieldErrors.referenceNo)}
            commentsInvalid={Boolean(state.productSearchFieldErrors.comments)}
            referenceNoErrorText={state.productSearchFieldErrors.referenceNo}
            commentsErrorText={state.productSearchFieldErrors.comments}
          />
        </div>

        <ARInvoiceProductSection
          sectionId="ar-invoice-product-section"
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
          updateProductRow={state.updateProductRow}
          removeProductRow={state.removeProductRow}
          setProductRowDraft={state.setProductRowDraft}
          clearProductRowDraft={state.clearProductRowDraft}
          totals={state.totals}
          summaryCurrencyLabel={state.summaryCurrencyLabel}
          createError={state.createError}
          createDisabledReason={state.createDisabledReason}
          createARInvoiceMutation={state.createARInvoiceMutation}
          missingMandatoryFields={state.missingMandatoryFields}
          requiredCompletionPercent={state.requiredCompletionPercent}
          handleCreateOrder={state.handleCreateOrder}
          onSubmitMode={state.handleCreateOrder}
          isSaved={state.isSaved}
          savedDocNum={state.savedDocNum}
          onDownload={(type) => {
            if (state.savedDocNum) {
              const label = type === "pdf" ? "PDF" : type === "excel" ? "Excel" : "Word";
              goeyToast.success(
                `Downloading ${label} for Document #${state.savedDocNum} (Feature coming soon!)`,
              );
            }
          }}
          onReset={() => {
            state.resetForm();
            window.scrollTo({ behavior: "smooth", top: 0 });
            void router.navigate({
              replace: true,
              search: {},
              to: "/sales/create-ar-invoice",
            });
          }}
          submitLabel={state.isEditMode ? "Update" : "Create"}
          submitLoadingText={state.isEditMode ? "Updating..." : "Adding..."}
          onEditRestrictedClick={state.showEditRestrictedToast}
          warehouses={state.warehouses}
          warehousesLoading={state.warehousesQuery.isLoading || isFormHydrating}
          secondaryActions={
            state.isEditMode && docNum ? (
              <CopyToDropdown
                docNum={docNum}
                sourceDocType="ARInvoice"
                targets={["A/R Credit Note"]}
              />
            ) : null
          }
        />
        <SharedCreateModals
          state={state}
          entityLabels={{
            vendorErrorMsg: "Unable to load customers",
            vendorPopupTitle: "Search Customers",
          }}
        />

        {!state.isEditMode && (
          <>
            <CopyFromDialog
              open={state.pullFromSOModalOpen}
              onClose={() => state.setPullFromSOModalOpen(false)}
              vendorCode={state.codeInput}
              vendorName={state.nameInput}
              sourceDocType="SalesOrder"
              onSelectDocuments={handleCopyFromSOSelect}
              committedDocNums={committedSODocNums.map(String)}
            />
            <CopyFromDialog
              open={state.pullFromSQModalOpen}
              onClose={() => state.setPullFromSQModalOpen(false)}
              vendorCode={state.codeInput}
              vendorName={state.nameInput}
              sourceDocType="SalesQuotation"
              onSelectDocuments={handleCopyFromSQSelect}
              committedDocNums={committedSQDocNums.map(String)}
            />
          </>
        )}
      </CreatePageWrapper>
    </div>
  );
}
