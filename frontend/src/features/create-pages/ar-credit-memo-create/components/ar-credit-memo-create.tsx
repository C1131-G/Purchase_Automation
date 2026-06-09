import { useQueryClient } from "@tanstack/react-query";
import { goeyToast } from "goey-toast";
import { useEffect, useMemo, useRef, useState } from "react";

import { ArCreditMemoProductSection } from "@/features/create-pages/ar-credit-memo-create/components/ar-credit-memo-product-section";
import { useArCreditMemoCreate } from "@/features/create-pages/ar-credit-memo-create/hooks/use-ar-credit-memo-create";
import { AddressGrid } from "@/features/create-pages/create-shared/components/grids/address-grid";
import { DocumentDatesGrid } from "@/features/create-pages/create-shared/components/grids/document-dates-grid";
import { LogisticsGrid } from "@/features/create-pages/create-shared/components/grids/logistics-grid";
import { ReferenceGrid } from "@/features/create-pages/create-shared/components/grids/reference-grid";
import { VendorCustomerGrid } from "@/features/create-pages/create-shared/components/grids/vendor-customer-grid";
import { CopyFromDropdown } from "@/features/create-pages/create-shared/components/layout/copy-from-dropdown";
import { CreatePageWrapper } from "@/features/create-pages/create-shared/components/layout/create-page-wrapper";
import { RelationshipMapTracker } from "@/features/create-shared/components/layout/relationship-map-tracker";
import {
  CopyFromDialog,
  type SourceDocType,
} from "@/features/create-pages/create-shared/components/modals/copy-from-dialog";
import { pageLoadingToast } from "@/features/create-pages/create-shared/utils/page-loading-toast";
import { SharedCreateModals } from "@/features/create-pages/create-shared/components/modals/shared-create-modals";
import {
  formatWarehouseDisplay,
  parseISODate,
  toDisplayDate,
  toISODate,
} from "@/features/create-pages/create-shared/utils/create-order.utils";
import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import { resolveDocumentLineDiscount } from "@/features/create-pages/create-shared/utils/resolve-document-line-discount";
import { arInvoiceAPI } from "@/features/table-pages/ar-invoices/api/ar-invoice.service";
import { arCreditMemoQueries } from "@/features/table-pages/ar-credit-memo/api/ar-credit-memo.queries";

export interface ArCreditMemoCreateProps {
  mode?: "create" | "edit";
  docNum?: string;
  sourceDocNum?: string | undefined;
  sourceDocType?: string | undefined;
}

/**
 * ArCreditMemoCreate: Main entry for the AR Credit Memo creation flow.
 * Layout matches the AR Invoice create page exactly:
 *  Row 1: Customer Info | Document Details (logistics) | Document Dates
 *  Row 2: Address | Reference
 *  Row 3: Product section (with checkboxes + return reason)
 */
export function ArCreditMemoCreate({
  mode = "create",
  docNum,
  sourceDocNum,
  sourceDocType,
}: ArCreditMemoCreateProps) {
  const queryClient = useQueryClient();

  const [sourceCleared, setSourceCleared] = useState(false);

  useEffect(() => {
    setSourceCleared(false);
  }, [sourceDocNum, sourceDocType]);

  const state = useArCreditMemoCreate({
    docNum,
    mode,
    sourceDocNum: !sourceCleared ? sourceDocNum : undefined,
    sourceDocType: !sourceCleared ? sourceDocType : undefined,
  });
  const docDateContainerRef = useRef<HTMLDivElement>(null);
  const deliveryDateContainerRef = useRef<HTMLDivElement>(null);

  const [copyFromDialogOpen, setCopyFromDialogOpen] = useState(false);

  const handleReset = () => {
    state.productsHook.setProductRows([]);
    state.productsHook.setProductRowDrafts({});
    state.setHeader({ comments: "", referenceNo: "" });
    state.resetWarehouse();
    setSourceCleared(true);
  };

  const committedDocNums = useMemo(() => {
    const docNums = new Set<string>();
    state.productsHook.productRows.forEach((r) => {
      if (r.baseType === 13) {
        const match = /row-copy-(\d+)-/.exec(r.id);
        if (match?.[1]) {
          docNums.add(match[1]);
        }
      }
    });
    if (
      !sourceCleared &&
      state.productsHook.productRows.some((r) => r.baseType === 13) &&
      sourceDocNum
    ) {
      docNums.add(sourceDocNum);
    }
    return Array.from(docNums);
  }, [state.productsHook.productRows, sourceDocNum, sourceCleared]);

  const handleCopyFromSelect = async (selected: { docNum: string; docType: SourceDocType }[]) => {
    setCopyFromDialogOpen(false);
    if (selected.length === 0) return;

    const loadingToast = pageLoadingToast("A/R Credit Memo", "create");
    try {
      const details = await Promise.all(
        selected.map(async (doc) => {
          const list = await arInvoiceAPI.getARInvoices({
            page: 1,
            limit: 10,
            DocNum: doc.docNum,
          });
          const exact = (list.data ?? []).find((item) => String(item.DocNum).trim() === doc.docNum);
          const fallback = list.data?.[0];
          const target = exact ?? fallback;
          if (!target || (!target.id && target.id !== 0)) {
            throw new Error("A/R invoice not found");
          }
          const res = await arInvoiceAPI.getARInvoiceById(target.id);
          return res.data;
        }),
      );

      const itemCodes = [
        ...new Set(
          details
            .flatMap((d) => (d.DocumentLines ?? []).map((l) => String(l.ItemCode ?? "")))
            .filter(Boolean),
        ),
      ];

      const [productMetaResponse, stocksResponse] = await Promise.all([
        queryClient.fetchQuery(
          createSharedQueries.products(undefined, undefined, itemCodes.length || 10, "sales"),
        ),
        Promise.all(
          itemCodes.map((code) =>
            queryClient.fetchQuery(createSharedQueries.productWarehouseStocks(code as string)),
          ),
        ),
      ]);

      const productByCode = new Map(productMetaResponse.map((p) => [p.code, p]));
      const stocksByCode = new Map(itemCodes.map((code, i) => [code, stocksResponse[i]]));

      const mappedRows = details.flatMap((d) => {
        const docLines = d.DocumentLines ?? [];
        const firstWarehouseCode = String(
          docLines[0]?.WarehouseCode ?? (d as any).WarehouseCode ?? "",
        ).trim();

        return docLines
          .filter((line) => {
            const openQty = line.RemainingOpenQuantity ?? line.Quantity ?? 0;
            return openQty > 0;
          })
          .map((line, index) => {
            const itemCode = String(line.ItemCode ?? "");
            const productMeta = productByCode.get(itemCode);
            const lineWarehouse = String(line.WarehouseCode || firstWarehouseCode);
            const warehouseStocks = (stocksByCode.get(itemCode) || []) as Record<string, unknown>[];
            const lineStock = lineWarehouse
              ? Number(
                  warehouseStocks.find((s) => String(s.code).trim() === lineWarehouse)?.stock ?? 0,
                )
              : warehouseStocks.reduce((sum, s) => sum + Number(s.stock ?? 0), 0);

            const price = Number(line.Price ?? line.UnitPrice ?? productMeta?.price ?? 0);
            const quantity = Number(line.RemainingOpenQuantity ?? line.Quantity ?? 0);
            const { discountPercent, discountAmount } = resolveDocumentLineDiscount({
              line: line as Record<string, unknown>,
              grossAmount: price * quantity,
              headerDiscountPercent: Number((d as Record<string, unknown>).DiscountPercent ?? 0),
            });

            return {
              baseEntry: Number(d.DocEntry || d.id) || undefined,
              baseLine: Number((line as any).LineNum ?? index),
              baseQuantity: Number(line.Quantity || 1),
              baseType: 13, // AR Invoice
              comment: "",
              currency: String(d.DocCurr || productMeta?.currency || ""),
              discountAmount,
              discountPercent,
              id: `row-copy-${d.DocNum}-${index}`,
              price,
              productCode: itemCode,
              productName: String(line.ItemDescription || productMeta?.name || ""),
              quantity,
              returnReason: "",
              selected: true,
              stock: lineStock,
              taxRate:
                line.VatPrcnt !== undefined
                  ? Number(line.VatPrcnt)
                  : Number(productMeta?.taxRate ?? 0),
              uomCode: String(line.UoMCode ?? productMeta?.uomCode ?? ""),
              uomEntry: Number(line.UoMEntry ?? productMeta?.uomEntry ?? 0) || undefined,
              vatGroup: String(line.VatGroup || line.TaxCode || productMeta?.vatGroup || ""),
              warehouseCode: lineWarehouse,
            };
          });
      });

      const firstDetail = details[0]!;
      const warehouseCode = String(
        (firstDetail.DocumentLines || [])[0]?.WarehouseCode ??
          (firstDetail as any).WarehouseCode ??
          "",
      ).trim();

      let salesEmployeeName = "";
      if (firstDetail.SalesPersonCode !== undefined && firstDetail.SalesPersonCode !== null) {
        const employeesData = await queryClient.fetchQuery(createSharedQueries.salesEmployees());
        const matched = employeesData.find(
          (e) => String(e.code) === String(firstDetail.SalesPersonCode),
        );
        salesEmployeeName = matched?.name || "";
      }

      state.setNameInput(String(firstDetail.CardName || ""));
      state.setCodeInput(String(firstDetail.CardCode || ""));
      if (salesEmployeeName) {
        state.setSalesEmployeeInput(salesEmployeeName);
      }
      if (warehouseCode) {
        const matchedWarehouse = state.warehouses.find(
          (w) => String(w.code).trim() === warehouseCode,
        );
        state.setWarehouseInput(
          formatWarehouseDisplay(matchedWarehouse?.name ?? warehouseCode, warehouseCode),
        );
      }
      state.setHeader({
        billToAddress: String(firstDetail.Address || ""),
        comments: `Based on AR Invoice ${firstDetail.DocNum}. ${String(firstDetail.Comments || "")}`,
        docDate: new Date().toISOString().split("T")[0]!,
        docDueDate: new Date().toISOString().split("T")[0]!,
        referenceNo: String(firstDetail.NumAtCard || ""),
        shipToAddress: String((firstDetail as any).Address2 || ""),
        vendorCode: String(firstDetail.CardCode || ""),
        vendorName: String(firstDetail.CardName || ""),
        warehouseCode: String(warehouseCode),
      });

      state.productsHook.setProductRows(mappedRows);
      state.productsHook.setProductRowDrafts({});
      loadingToast.dismiss();
      goeyToast.success("Products pulled successfully");
    } catch (err) {
      console.error(err);
      loadingToast.dismiss();
      goeyToast.error("Failed to pull products");
    }
  };

  const {
    header,
    setHeader,
    vendorsQuery,
    warehousesQuery,
    salesEmployeesQuery,
    nameInput,
    codeInput,
    nameFocused,
    setNameFocused,
    codeFocused,
    setCodeFocused,
    nameSuggestions,
    codeSuggestions,
    salesEmployeeInput,
    setSalesEmployeeFocused,
    salesEmployeeFocused,
    salesEmployeeSuggestions,
    warehouseInput,
    warehouseFocused,
    warehouseSuggestions,
    handleWarehouseChange,
    handleVendorNameChange,
    handleVendorCodeChange,
    handleSalesEmployeeChange,
    selectVendor,
    openPopup,
    productsHook,
    totals,
    summaryCurrencyLabel,
    createError,
    createDisabledReason,
    createArCreditMemoMutation,
    missingMandatoryFields,
    requiredCompletionPercent,
    handleCreateOrder,
    missingSearchMandatoryFields,
    searchRequiredCompletionPercent,
    searchMandatoryFields,
    warehouses,
    warehousesLoading,
  } = state;

  // Build the state shape SharedCreateModals expects
  const modalsState = {
    activeProductRowId: productsHook.activeProductRowId,
    activeRowProductCode: null,
    applyProductToRow: (product: Parameters<typeof productsHook.applyProductToRow>[0]) =>
      productsHook.applyProductToRow(product, {
        closeProductPopup: () => state.setProductPopupOpen(false),
      }),
    applyProductsToRows: (products: Parameters<typeof productsHook.applyProductsToRows>[0]) =>
      productsHook.applyProductsToRows(products, {
        closeProductPopup: () => state.setProductPopupOpen(false),
      }),
    effectiveWarehouseCode: header.warehouseCode,
    handleLookupModalSearchSync: state.handleLookupModalSearchSync,
    loadMoreProducts: productsHook.loadMoreProducts,
    modalMode: state.modalMode,
    modalOpen: state.modalOpen,
    modalSearch: state.modalSearch,
    popupResults: state.popupResults,
    productPopupOpen: state.productPopupOpen,
    productSearch: state.productSearch,
    productWarehouseStocksQuery: productsHook.productWarehouseStocksQuery,
    products: productsHook.products,
    productsQuery: productsHook.productsQuery,
    salesEmployeesQuery,
    searchWarehouseCode: productsHook.searchWarehouseCode,
    selectSalesEmployee: state.selectSalesEmployee,
    selectVendor,
    selectWarehouse: state.selectWarehouse,
    setModalOpen: state.setModalOpen,
    setModalSearch: state.setModalSearch,
    setProductPopupOpen: state.setProductPopupOpen,
    setProductSearch: state.setProductSearch,
    setStockPreviewProduct: state.setStockPreviewProduct,
    stockPreviewProduct: state.stockPreviewProduct,
    vendorsQuery,
    warehousesQuery,
  };

  return (
    <div
      onClickCapture={() => goeyToast.dismiss()}
      onKeyDownCapture={() => goeyToast.dismiss()}
      className="contents"
    >
      <CreatePageWrapper
        rootLabel="Sales"
        breadcrumbParent={{
          label: "AR Credit Memos Data Table",
          onMouseEnter: () =>
            void queryClient.prefetchQuery(arCreditMemoQueries.list({ limit: 10, page: 1 })),
          to: "/sales/ar-credit-memo",
        }}
        pageTitle={state.isEditMode ? `A/R Credit Memo - ${docNum}` : "Create A/R Credit Memo"}
        topActions={
          !state.isEditMode ? (
            <CopyFromDropdown
              vendorCode={codeInput}
              vendorName={nameInput}
              sourceDocTypes={["ARInvoice"]}
              onSelectSource={() => setCopyFromDialogOpen(true)}
              onReset={productsHook.productRows.length > 0 ? handleReset : undefined}
            />
          ) : null
        }
      >
        {state.trackerDocEntry > 0 && (
          <div className="mb-4 flex flex-col xl:flex-row xl:items-end justify-between gap-4">
            <div className="flex items-center justify-end gap-4 flex-1 xl:-mt-6">
              <div className="relative z-10 overflow-x-auto max-w-full">
                <RelationshipMapTracker
                  docType={state.trackerDocType}
                  docEntry={state.trackerDocEntry}
                  compact={true}
                />
              </div>
            </div>
          </div>
        )}

        {/* Row 1: Customer Info | Document Details (Logistics) | Document Dates — matches AR Invoice */}
        <div className="grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
          <VendorCustomerGrid
            loading={vendorsQuery.isLoading}
            error={
              vendorsQuery.isError
                ? vendorsQuery.error instanceof Error
                  ? vendorsQuery.error.message
                  : "Unable to load customers."
                : null
            }
            sectionTitle="Customer Info"
            nameLabel="Customer Name *"
            codeLabel="Customer Code *"
            namePlaceholder="Select or Type Customer"
            codePlaceholder="Select or Type Code"
            nameInput={nameInput}
            codeInput={codeInput}
            nameFocused={nameFocused}
            codeFocused={codeFocused}
            nameSuggestions={nameSuggestions}
            codeSuggestions={codeSuggestions}
            onNameChange={handleVendorNameChange}
            onCodeChange={handleVendorCodeChange}
            onNameFocus={() => setNameFocused(true)}
            onCodeFocus={() => setCodeFocused(true)}
            onNameBlur={() => setTimeout(() => setNameFocused(false), 120)}
            onCodeBlur={() => setTimeout(() => setCodeFocused(false), 120)}
            onOpenNamePopup={() => openPopup("vendor-name")}
            onOpenCodePopup={() => openPopup("vendor-code")}
            onSelectVendor={selectVendor}
          />

          <LogisticsGrid
            salesEmployeeLabel="Sales Employee"
            salesEmployeeInput={salesEmployeeInput}
            salesEmployeesLoading={salesEmployeesQuery.isLoading}
            error={
              salesEmployeesQuery.isError || warehousesQuery.isError
                ? "Unable to load logistics details."
                : null
            }
            salesEmployeeFocused={salesEmployeeFocused}
            salesEmployeeSuggestions={salesEmployeeSuggestions}
            onSalesEmployeeChange={handleSalesEmployeeChange}
            onSalesEmployeeFocus={() => setSalesEmployeeFocused(true)}
            onSalesEmployeeBlur={() => setTimeout(() => setSalesEmployeeFocused(false), 120)}
            onOpenSalesEmployeePopup={() => openPopup("sales-employee")}
            onSelectSalesEmployee={state.selectSalesEmployee}
            showWarehouseInsteadOfDocNum={true}
            warehouseLabel="Warehouse"
            warehouseInput={warehouseInput}
            warehousesLoading={warehousesQuery.isLoading}
            warehouseFocused={warehouseFocused}
            warehouseSuggestions={warehouseSuggestions}
            onWarehouseChange={handleWarehouseChange}
            onWarehouseFocus={() => state.setWarehouseFocused(true)}
            onWarehouseBlur={() => setTimeout(() => state.setWarehouseFocused(false), 120)}
            onOpenWarehousePopup={() => openPopup("warehouse")}
            onSelectWarehouse={state.selectWarehouse}
            warehouseDisabled={state.isEditMode}
            warehouseCode={header.warehouseCode}
            salesEmployeeDisabled={state.isEditMode}
          />

          <DocumentDatesGrid
            loading={false}
            docDate={header.docDate}
            docDueDate={header.docDueDate}
            today={new Date()}
            activeDatePicker={null}
            docDateContainerRef={docDateContainerRef}
            deliveryDateContainerRef={deliveryDateContainerRef}
            toDisplayDate={toDisplayDate}
            parseISODate={parseISODate}
            toISODate={toISODate}
            onSetActiveDatePicker={() => {}}
            onDocDateChange={(value) => setHeader({ docDate: value })}
            onDocDueDateChange={(value) => setHeader({ docDueDate: value })}
            docDueDateReadOnly={false}
          />
        </div>

        {/* Row 2: Address | Reference — matches AR Invoice */}
        <div className="mt-3 grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
          <AddressGrid
            loading={false}
            billToAddress={header.billToAddress ?? ""}
            shipToAddress={header.shipToAddress ?? ""}
            readOnly={false}
            onBillToAddressChange={(value) => setHeader({ billToAddress: value })}
            onShipToAddressChange={(value) => setHeader({ shipToAddress: value })}
          />

          <ReferenceGrid
            loading={false}
            referenceNo={header.referenceNo}
            comments={header.comments}
            referenceNoDisabled={false}
            commentsDisabled={false}
            onReferenceNoChange={(value) => setHeader({ referenceNo: value })}
            onCommentsChange={(value) => setHeader({ comments: value })}
          />
        </div>

        {/* Row 3: Product lines with checkboxes + return reason */}
        <ArCreditMemoProductSection
          sectionId="ar-credit-memo-product-section"
          missingSearchMandatoryFields={missingSearchMandatoryFields}
          searchRequiredCompletionPercent={searchRequiredCompletionPercent}
          searchMandatoryFields={searchMandatoryFields}
          openProductPopup={productsHook.openProductPopup}
          prefetchProducts={productsHook.prefetchProducts}
          productRows={productsHook.productRows}
          productRowDrafts={productsHook.productRowDrafts}
          updateProductRow={productsHook.updateProductRow}
          removeProductRow={productsHook.removeProductRow}
          setProductRowDraft={productsHook.setProductRowDraft}
          clearProductRowDraft={productsHook.clearProductRowDraft}
          totals={totals}
          summaryCurrencyLabel={summaryCurrencyLabel}
          createError={createError}
          createDisabledReason={createDisabledReason}
          createArCreditMemoMutation={createArCreditMemoMutation}
          missingMandatoryFields={missingMandatoryFields}
          requiredCompletionPercent={requiredCompletionPercent}
          handleCreateOrder={handleCreateOrder}
          submitLabel={state.isEditMode ? "Update" : "Create"}
          submitLoadingText={state.isEditMode ? "Updating..." : "Creating..."}
          warehouses={warehouses}
          warehousesLoading={warehousesLoading}
        />

        <SharedCreateModals
          state={modalsState}
          entityLabels={{
            vendorErrorMsg: "Unable to load customers",
            vendorPopupTitle: "Search Customers",
          }}
        />

        {!state.isEditMode && (
          <CopyFromDialog
            open={copyFromDialogOpen}
            onClose={() => setCopyFromDialogOpen(false)}
            vendorCode={codeInput}
            vendorName={nameInput}
            sourceDocType="ARInvoice"
            onSelectDocuments={handleCopyFromSelect}
            committedDocNums={committedDocNums}
          />
        )}
      </CreatePageWrapper>
    </div>
  );
}
