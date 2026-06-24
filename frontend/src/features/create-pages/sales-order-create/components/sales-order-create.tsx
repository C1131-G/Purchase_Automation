import { useQueryClient } from "@tanstack/react-query";
import { useSearch, useRouter } from "@tanstack/react-router";
import { goeyToast } from "goey-toast";
import { useEffect, useMemo, useState, type MouseEvent } from "react";

import { useDocumentDownload } from "@/features/create-pages/create-shared/hooks/use-document-download";
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
  parseISODate,
  toDisplayDate,
  toISODate,
} from "@/features/create-pages/create-shared/utils/create-order.utils";
import { RelationshipMapTracker } from "@/features/create-shared/components/layout/relationship-map-tracker";
import {
  CopyFromDialog,
  type SourceDocType,
} from "@/features/create-pages/create-shared/components/modals/copy-from-dialog";
import { pageLoadingToast } from "@/features/create-pages/create-shared/utils/page-loading-toast";
import { salesQuotationAPI } from "@/features/table-pages/sales-quotations/api/sales-quotation.service";
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
  const router = useRouter();
  const search = useSearch({ strict: false });
  const sourceDocNum =
    mode === "create" ? (search as Record<string, string | undefined>).sourceDocNum : undefined;
  const sourceDocType =
    mode === "create" ? (search as Record<string, string | undefined>).sourceDocType : undefined;

  const [sourceCleared, setSourceCleared] = useState(false);

  useEffect(() => {
    setSourceCleared(false);
  }, [sourceDocNum, sourceDocType]);

  const state = useSalesOrderCreate(
    docNum
      ? { docNum, mode }
      : {
          mode,
          sourceDocNum: !sourceCleared ? sourceDocNum : undefined,
          sourceDocType: !sourceCleared ? sourceDocType : undefined,
        },
  );

  const committedSQDocNums = useMemo(() => {
    const docNums = new Set<number>();
    state.productRows.forEach((r) => {
      if (r.baseType === 23) {
        const match = /Based on SQ (\d+)/.exec(r.comment ?? "");
        if (match?.[1]) {
          docNums.add(Number(match[1]));
        }
      }
    });
    if (!sourceCleared && state.productRows.some((r) => r.baseType === 23)) {
      const urlDocNum = Number(sourceDocNum);
      if (urlDocNum && !isNaN(urlDocNum)) {
        docNums.add(urlDocNum);
      }
    }
    return Array.from(docNums);
  }, [state.productRows, sourceDocNum, sourceCleared]);

  const hasCopiedRows = committedSQDocNums.length > 0;

  const handleReset = () => {
    state.setProductRows([]);
    state.setProductRowDrafts({});
    state.setHeader({ comments: "", referenceNo: "" });
    state.resetWarehouse();
    setSourceCleared(true);
  };

  const handleCopyFromSelect = async (selected: { docNum: string; docType: SourceDocType }[]) => {
    state.setPullFromSQModalOpen(false);
    if (selected.length === 0) return;

    const loadingToast = pageLoadingToast("Sales Order", "create");
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

      if (details.length > 0) {
        const firstDetail = details[0]!;
        const address = String(firstDetail.Address ?? "").trim();
        const address2 = String((firstDetail as any).Address2 ?? "").trim();
        const rawComments = String(firstDetail.Comments ?? "").trim();
        const referenceNo = String((firstDetail as any).NumAtCard ?? "").trim();
        const comments = rawComments || `Based on Sales Quotation ${firstDetail.DocNum}`;

        if (address) {
          state.setBillToAddress(address);
        }
        if (address2) {
          state.setShipToAddress(address2);
        }
        state.setHeader({
          comments,
          referenceNo,
          vendorCode: String(firstDetail.CardCode ?? "").trim(),
          vendorName: String(firstDetail.CardName ?? "").trim(),
        });
      }

      loadingToast.dismiss();
      goeyToast.success("Products added successfully");
    } catch (err) {
      console.error(err);
      loadingToast.dismiss();
      goeyToast.error("Failed to pull products");
    }
  };

  const pageTitle = state.isEditMode ? `Update Sales Order ${docNum}` : "Create Sales Order";
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
        dashboardName="Sales Dashboard"
        dashboardUrl="/dashboard/sales"
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
        topActions={
          !state.isEditMode ? (
            <CopyFromDropdown
              vendorCode={state.codeInput}
              vendorName={state.nameInput}
              sourceDocTypes={["SalesQuotation"]}
              onSelectSource={() => state.setPullFromSQModalOpen(true)}
              onReset={hasCopiedRows ? handleReset : undefined}
            />
          ) : null
        }
      >
        {state.trackerDocType && state.trackerDocEntry && (
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
            billToLabel="Pay To Address"
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

        {/* Attachments Section Card */}
        <div className="mt-3">
          <SectionCard title="ATTACHMENTS">
            <UploadGrid
              attachments={state.attachments}
              onAttachmentsChange={state.setAttachments}
              moduleName="SalesOrder"
              readOnly={state.isClosed}
              loading={isFormHydrating}
            />
          </SectionCard>
        </div>

        <SalesOrderProductSection
          sectionId="sales-order-product-section"
          submitDisabled={state.submitDisabled}
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
          createSalesOrderMutation={state.createSalesOrderMutation}
          missingMandatoryFields={state.missingMandatoryFields}
          requiredCompletionPercent={state.requiredCompletionPercent}
          handleCreateOrder={state.handleCreateOrder}
          onSubmitMode={state.handleCreateOrder}
          isEditMode={state.isEditMode}
          isSaved={state.isSaved}
          savedDocNum={state.savedDocNum}
          onDownload={useDocumentDownload(
            mode === "edit" ? docNum : state.savedDocNum,
            "sales-orders",
            "Sales_Order",
          )}
          onReset={() => {
            state.resetForm();
            window.scrollTo({ behavior: "smooth", top: 0 });
            void router.navigate({
              replace: true,
              search: {},
              to: "/sales/create-order",
              viewTransition: true,
            });
          }}
          submitLabel={state.isEditMode ? "Update" : "Create"}
          submitLoadingText={state.isEditMode ? "Updating..." : "Adding..."}
          secondaryActions={
            state.isEditMode && !state.isClosed && docNum ? (
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
          <CopyFromDialog
            open={state.pullFromSQModalOpen}
            onClose={() => state.setPullFromSQModalOpen(false)}
            vendorCode={state.codeInput}
            vendorName={state.nameInput}
            sourceDocType="SalesQuotation"
            onSelectDocuments={handleCopyFromSelect}
            committedDocNums={committedSQDocNums.map(String)}
          />
        )}
      </CreatePageWrapper>
    </div>
  );
}
