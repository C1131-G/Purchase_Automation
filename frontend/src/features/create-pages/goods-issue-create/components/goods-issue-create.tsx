import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  LayoutDashboard,
  Table,
  Plus,
  Eye,
  CheckSquare,
  FileText,
  ChevronDown,
  Search,
} from "lucide-react";

import { Button } from "@/components/button";
import { Popover } from "@/components/popover";
import { LookupPopup } from "@/components/lookup/lookup-popup";

import { CreatePageWrapper } from "@/features/create-pages/create-shared/components/layout/create-page-wrapper";
import { InventoryDocumentHeader } from "@/features/create-pages/create-shared/components/inventory/inventory-document-header";
import { InventoryDocumentFooter } from "@/features/create-pages/create-shared/components/inventory/inventory-document-footer";
import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";
import {
  UploadGrid,
  type AttachmentItem,
} from "@/features/create-pages/create-shared/components/grids/upload-grid";
import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import { masterDataAPI } from "@/features/create-pages/create-shared/api/master-data.service";
import {
  notifyActionError,
  notifyActionSuccess,
} from "@/features/create-pages/create-shared/utils/create-feedback-toast";
import type { GoodsIssueRow } from "@/features/create-pages/goods-issue-create/types/goods-issue.types";
import { GoodsIssueTable } from "@/features/create-pages/goods-issue-create/components/goods-issue-table";
import { ProductPopupModal } from "@/features/create-pages/create-shared/components/modals/product-popup-modal";
import { apiClient } from "@/shared/api/client";
import { goodsIssueKeys } from "@/features/table-pages/goods-issue/api/goods-issue.queries";

// ─── SAP mutation ────────────────────────────────────────────────────────────

interface CreateGoodsIssuePayload {
  DocDate: string;
  TaxDate: string;
  Ref2?: string;
  Comments?: string;
  JrnlMemo?: string;
  PriceList?: number;
  Attachments?: any[];
  DocumentLines: {
    ItemCode: string;
    Quantity: number;
    UnitPrice: number;
    WarehouseCode?: string;
    UoMCode?: string;
    AccountCode?: string;
    CostingCode?: string;
    BinLocationAllocation?: number;
    SerialNumbers?: { InternalSerialNumber: string }[];
    BatchNumbers?: { BatchNumber: string; Quantity: number }[];
    InventoryAdjustmentReason?: string;
  }[];
}

async function postGoodsIssue(payload: CreateGoodsIssuePayload) {
  return apiClient<{ success: boolean; DocNum: number; DocEntry: number }>("/api/v1/goods-issues", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function useCreateGoodsIssue() {
  return useMutation({
    mutationFn: postGoodsIssue,
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

const ID_PREFIX = "gr";

const getTodayISO = () => new Date().toISOString().slice(0, 10);

/**
 * GoodsIssueCreate: Full standalone orchestrator for the Goods Issue entry form.
 * Manages its own state, queries warehouses/UOMs, and posts to SAP via the backend.
 */
export function GoodsIssueCreate() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [priceList, setPriceList] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [series, setSeries] = useState("");
  const [postingDate, setPostingDate] = useState(getTodayISO());
  const [documentDate, setDocumentDate] = useState(getTodayISO());
  const [ref2, setRef2] = useState("");
  const [remarks, setRemarks] = useState("");
  const [journalRemark, setJournalRemark] = useState("Goods Issue");
  const [rows, setRows] = useState<GoodsIssueRow[]>([
    {
      id: "default-1",
      itemNo: "",
      itemDescription: "",
      uomCode: "",
      uomName: "",
      whse: "",
      quantity: 1,
      unitPrice: "0",
      total: "0",
      binLocationAllocation: 0,
      accountCode: "",
      costingCode: "",
    },
    {
      id: "default-2",
      itemNo: "",
      itemDescription: "",
      uomCode: "",
      uomName: "",
      whse: "",
      quantity: 1,
      unitPrice: "0",
      total: "0",
      binLocationAllocation: 0,
      accountCode: "",
      costingCode: "",
    },
    {
      id: "default-3",
      itemNo: "",
      itemDescription: "",
      uomCode: "",
      uomName: "",
      whse: "",
      quantity: 1,
      unitPrice: "0",
      total: "0",
      binLocationAllocation: 0,
      accountCode: "",
      costingCode: "",
    },
  ]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  // Branch state
  const [branch, setBranch] = useState("");
  const [branchLookupOpen, setBranchLookupOpen] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");

  // Product popup state
  const [productPopupOpen, setProductPopupOpen] = useState(false);
  // activeProductRowId: null means "opened from document level" → multi-select mode
  // a row ID means "replace this specific row" → also multi-select but anchored to that row first
  const [activeProductRowId, setActiveProductRowId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");

  const warehousesQuery = useQuery(createSharedQueries.warehouses());
  const uomsQuery = useQuery(createSharedQueries.uoms());
  const priceListsQuery = useQuery(createSharedQueries.priceLists());
  const seriesQuery = useQuery(createSharedQueries.series("59")); // 59 is typically Goods Issue
  const branchesQuery = useQuery(createSharedQueries.branches());
  const reasonsQuery = useQuery(createSharedQueries.inventoryAdjustmentReasons("issue"));

  const warehouses = warehousesQuery.data ?? [];
  const priceLists = priceListsQuery.data ?? [];
  const seriesOptions = seriesQuery.data ?? [];
  const branches = branchesQuery.data ?? [];
  const reasons = reasonsQuery.data ?? [];

  const resolvedSeries = series || (seriesOptions.length > 0 ? seriesOptions[0]!.code : "");

  // Set default price list once data is loaded
  const resolvedPriceList =
    priceList || (priceLists.length > 0 ? priceLists[0]!.name : "Last Purchase Price");

  // Determine the price list CODE (numeric string) to pass to the products API
  const resolvedPriceListCode = (() => {
    if (resolvedPriceList === "Last Evaluated Price") return "-2";
    if (resolvedPriceList === "Last Purchase Price") return "-1";
    const selected = priceLists.find((pl) => pl.name === resolvedPriceList);
    return selected ? selected.code : undefined;
  })();

  const productsQuery = useQuery({
    ...createSharedQueries.products(
      undefined,
      productSearch || undefined,
      50,
      undefined,
      resolvedPriceListCode,
    ),
    enabled: productPopupOpen,
  });

  const products = productsQuery.data ?? [];

  // Re-price all existing rows when the price list changes
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    if (!resolvedPriceListCode) return;
    const filledRows = rowsRef.current.filter((r) => r.itemNo.trim());
    if (filledRows.length === 0) return;

    const uniqueItemCodes = [...new Set(filledRows.map((r) => r.itemNo.trim()))];

    Promise.all(
      uniqueItemCodes.map((code) =>
        masterDataAPI
          .getProducts({ search: code, limit: 5, priceList: resolvedPriceListCode })
          .then((res) => {
            const raw = res as unknown as Record<string, unknown>;
            const items: Record<string, unknown>[] = Array.isArray(raw)
              ? (raw as Record<string, unknown>[])
              : Array.isArray(raw.data)
                ? (raw.data as Record<string, unknown>[])
                : [];
            // Use the first returned item since the backend search (using LIKE) handles invisible chars/partial matches
            const match = items[0];
            return {
              code,
              price: match ? Number(match.Price ?? match.price ?? match.AvgPrice ?? 0) : null,
            };
          })
          .catch(() => ({ code, price: null })),
      ),
    ).then((results) => {
      const priceByCode = new Map(
        results.filter((r) => r.price !== null).map((r) => [r.code, r.price as number]),
      );
      if (priceByCode.size === 0) return;
      setRows((prev) =>
        prev.map((r) => {
          if (!r.itemNo.trim()) return r;
          const newPrice = priceByCode.get(r.itemNo.trim());
          if (newPrice === undefined) return r;
          const qty = r.quantity || 1;
          const total = qty * newPrice;
          return {
            ...r,
            unitPrice: String(newPrice),
            total: total > 0 ? total.toFixed(2) : "0.00",
          };
        }),
      );
    });
  }, [resolvedPriceListCode]);

  const createMutation = useCreateGoodsIssue();

  const openProductPopup = (rowId: string | null) => {
    setActiveProductRowId(rowId);
    setProductPopupOpen(true);
    setProductSearch("");
  };

  const prefetchProducts = () => {};

  /**
   * Called when a single product is selected (row-level, immediate apply).
   */
  const selectProduct = (product: {
    code: string;
    name: string;
    uomCode?: string;
    uomName?: string;
    price?: number;
  }) => {
    if (activeProductRowId !== null) {
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== activeProductRowId) return r;
          const qty = r.quantity || 1;
          const price = product.price ?? 0;
          const total = qty * price;
          return {
            ...r,
            itemNo: product.code,
            itemDescription: product.name,
            uomCode: product.uomCode ?? r.uomCode,
            uomName: product.uomName ?? r.uomName,
            unitPrice: String(price),
            total: total.toFixed(2),
          };
        }),
      );
    }
    setProductPopupOpen(false);
  };

  const handleAdd = (mode: "save-new" | "view" | "close" | "draft" = "save-new") => {
    if (rows.length === 0) {
      return;
    }
    const validRows = rows.filter((r) => r.itemNo.trim());
    if (validRows.length === 0) {
      return;
    }

    const payload: CreateGoodsIssuePayload = {
      DocDate: postingDate || getTodayISO(),
      TaxDate: documentDate || getTodayISO(),
      ...(ref2 ? { Ref2: ref2 } : {}),
      ...(remarks ? { Comments: remarks } : {}),
      ...(attachments.length > 0 ? { Attachments: attachments } : {}),
      ...(resolvedPriceListCode !== undefined ? { PriceList: Number(resolvedPriceListCode) } : {}),
      JrnlMemo: journalRemark || "Goods Issue",
      DocumentLines: validRows.map((r) => ({
        ItemCode: r.itemNo,
        Quantity: Number(r.quantity) || 1,
        UnitPrice: parseFloat(String(r.unitPrice).replace(/[^0-9.]/g, "")) || 0,
        ...(r.whse ? { WarehouseCode: r.whse } : {}),
        ...(r.uomCode ? { UoMCode: r.uomCode } : {}),
        ...(r.accountCode ? { AccountCode: r.accountCode } : {}),
        ...(branch ? { CostingCode: branch } : {}),
        ...(r.inventoryAdjustmentReason
          ? { InventoryAdjustmentReason: r.inventoryAdjustmentReason }
          : {}),
        ...(r.binLocationAllocation
          ? {
              DocumentLinesBinAllocations: [
                {
                  BinAbsEntry: r.binLocationAllocation,
                  Quantity: Number(r.quantity) || 1,
                },
              ],
            }
          : {}),
      })),
    };

    createMutation.mutate(payload, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: goodsIssueKeys.all });
        notifyActionSuccess(
          data.DocNum != null ? `Goods issue #${data.DocNum} created` : "Goods issue created",
          "goods-issue-create",
        );
        // Handle modes
        if (mode === "save-new") {
          setRows([]);
          setRemarks("");
          setRef2("");
          setPostingDate(getTodayISO());
          setDocumentDate(getTodayISO());
        } else if (mode === "view") {
          void router.navigate({
            to: "/inventory/goods-issue/$docNum/update",
            params: { docNum: String(data.DocNum) },
            search: { limit: 10, page: 1 } as any,
            viewTransition: true,
          });
        } else if (mode === "close") {
          void router.navigate({
            to: "/inventory/goods-issue",
            search: { limit: 10, page: 1 } as any,
            viewTransition: true,
          });
        } else if (mode === "draft") {
          // Just stay on the same page, keep the data (or reset if preferred)
          setRows([]);
          setRemarks("");
          setRef2("");
        }
      },
      onError: (error: unknown) => {
        notifyActionError(error, "Failed to create goods issue.", "goods-issue-create");
      },
    });
  };

  return (
    <CreatePageWrapper
      dashboardUrl="/dashboard/inventory"
      breadcrumbParent={{ label: "Goods Issue Data Table", to: "/inventory/goods-issue" }}
      pageTitle="Create Goods Issue"
    >
      <div className="space-y-4">
        {/* Header */}
        <InventoryDocumentHeader
          series={resolvedSeries}
          seriesOptions={seriesOptions}
          seriesLoading={seriesQuery.isLoading}
          priceList={resolvedPriceList}
          priceLists={priceLists}
          priceListsLoading={priceListsQuery.isLoading}
          postingDate={postingDate}
          documentDate={documentDate}
          ref2={ref2}
          number={docNumber}
          onNumberChange={setDocNumber}
          onSeriesChange={setSeries}
          onPriceListChange={setPriceList}
          onPostingDateChange={setPostingDate}
          onDocumentDateChange={setDocumentDate}
          onRef2Change={setRef2}
          idPrefix={ID_PREFIX}
        >
          <div>
            <label className="mb-1.5 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Branch
            </label>
            <div className="relative">
              <input
                type="text"
                value={branch}
                readOnly
                onClick={() => setBranchLookupOpen(true)}
                className="h-10 w-full cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50 pl-3 pr-8 text-sm text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                placeholder="Select Branch"
              />
              <button
                type="button"
                onClick={() => setBranchLookupOpen(true)}
                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
            <LookupPopup
              open={branchLookupOpen}
              mode="warehouse"
              search={branchSearch}
              results={branches.filter(
                (b) =>
                  b.code.toLowerCase().includes(branchSearch.toLowerCase()) ||
                  b.name.toLowerCase().includes(branchSearch.toLowerCase()),
              )}
              loading={branchesQuery.isLoading}
              error={branchesQuery.isError ? "Error loading branches" : null}
              title="Select Branch"
              searchPlaceholder="Search branch code or name..."
              codeLabel="Code"
              nameLabel="Name"
              onSearchChange={setBranchSearch}
              onClose={() => setBranchLookupOpen(false)}
              onSelect={(item) => {
                setBranch(item.code);
                setBranchLookupOpen(false);
              }}
            />
          </div>
        </InventoryDocumentHeader>

        {/* Table */}
        <GoodsIssueTable
          rows={rows}
          onRowsChange={setRows}
          openProductPopup={openProductPopup}
          prefetchProducts={prefetchProducts}
          warehouses={warehouses}
          warehousesLoading={warehousesQuery.isLoading}
          uoms={uomsQuery.data ?? []}
          reasons={reasons}
          priceListCode={resolvedPriceListCode ?? undefined}
        />
        {/* Product selection popup — always multi-select capable */}
        {productPopupOpen && (
          <ProductPopupModal
            open={productPopupOpen}
            search={productSearch}
            results={products}
            loading={productsQuery.isLoading}
            backgroundLoading={productsQuery.isFetching && !productsQuery.isLoading}
            error={productsQuery.isError ? "Error loading products" : null}
            onSearchChange={setProductSearch}
            onClose={() => setProductPopupOpen(false)}
            onSelect={(p) =>
              selectProduct({
                code: p.code,
                name: p.name,
                ...(p.uomCode ? { uomCode: p.uomCode } : {}),
                ...(p.uomName ? { uomName: p.uomName } : {}),
                price: p.price,
              })
            }
            onSelectMultiple={(items) => {
              setRows((prev) => {
                const newRows = [...prev];
                const itemsToInsert = [...items];

                // 1. Replace the active row first, if any
                if (activeProductRowId) {
                  const targetIdx = newRows.findIndex((r) => r.id === activeProductRowId);
                  if (targetIdx !== -1 && itemsToInsert.length > 0) {
                    const first = itemsToInsert.shift()!;
                    newRows[targetIdx] = {
                      ...newRows[targetIdx],
                      id: newRows[targetIdx]!.id,
                      whse: newRows[targetIdx]!.whse,
                      quantity: newRows[targetIdx]!.quantity,
                      binLocationAllocation: newRows[targetIdx]!.binLocationAllocation,
                      accountCode: newRows[targetIdx]!.accountCode,
                      costingCode: newRows[targetIdx]!.costingCode,
                      itemNo: first.code,
                      itemDescription: first.name,
                      uomCode: first.uomCode ?? "",
                      uomName: first.uomName ?? "",
                      unitPrice: String(first.price ?? 0),
                      total: (1 * (first.price ?? 0)).toFixed(2),
                    };
                  }
                }

                for (let i = 0; i < newRows.length && itemsToInsert.length > 0; i++) {
                  const currentRow = newRows[i]!;
                  if (!currentRow.itemNo.trim()) {
                    const next = itemsToInsert.shift()!;
                    newRows[i] = {
                      ...currentRow,
                      id: currentRow.id,
                      whse: currentRow.whse,
                      quantity: currentRow.quantity,
                      binLocationAllocation: currentRow.binLocationAllocation,
                      accountCode: currentRow.accountCode,
                      costingCode: currentRow.costingCode,
                      itemNo: next.code,
                      itemDescription: next.name,
                      uomCode: next.uomCode ?? "",
                      uomName: next.uomName ?? "",
                      unitPrice: String(next.price ?? 0),
                      total: (1 * (next.price ?? 0)).toFixed(2),
                    };
                  }
                }

                // 3. Append remaining items as new rows
                const restRows = itemsToInsert.map((item) => ({
                  id: Math.random().toString(36).substr(2, 9),
                  itemNo: item.code,
                  itemDescription: item.name,
                  uomCode: item.uomCode ?? "",
                  uomName: item.uomName ?? "",
                  whse: "",
                  quantity: 1,
                  unitPrice: String(item.price ?? 0),
                  total: (1 * (item.price ?? 0)).toFixed(2),
                  binLocationAllocation: 0,
                  accountCode: "",
                  costingCode: "",
                }));

                return newRows.concat(restRows);
              });
              setProductPopupOpen(false);
            }}
            // Always use "__document_search__" so the modal is in multi-select mode
            selectedProductRowId="__document_search__"
          />
        )}

        {/* Attachments Section Card */}
        <div className="mt-3">
          <SectionCard title="ATTACHMENTS">
            <UploadGrid
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              moduleName="GoodsIssue"
            />
          </SectionCard>
        </div>

        {/* Footer */}
        <InventoryDocumentFooter
          remarks={remarks}
          journalRemark={journalRemark}
          onRemarksChange={setRemarks}
          onJournalRemarkChange={setJournalRemark}
          idPrefix={ID_PREFIX}
          journalRemarkPlaceholder="Goods Issue"
        />

        {/* Actions */}
        {/* Actions */}
        <div className="mt-4 flex items-center justify-between gap-2">
          {/* Left Side: Go Back Button */}
          <div className="flex items-center gap-2">
            <Popover.Root>
              <Popover.Trigger asChild>
                <Button
                  type="button"
                  size="md"
                  variant="outline"
                  className="group h-11 w-56 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-blue-600 normal-case tracking-normal focus:outline-none focus:ring-0 ring-0 outline-none flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                  Go Back
                </Button>
              </Popover.Trigger>
              <Popover.Content side="top" align="start" className="w-56 z-[1001]">
                <div className="flex flex-col py-1">
                  <button
                    type="button"
                    onClick={() => {
                      void router.navigate({
                        to: "/dashboard/inventory" as any,
                        viewTransition: true,
                      });
                    }}
                    className="group flex w-full items-start gap-3 px-3 py-2.5 hover:bg-zinc-50 transition-all text-left cursor-pointer"
                  >
                    <LayoutDashboard className="mt-0.5 h-4 w-4 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                    <span className="flex flex-col">
                      <span className="text-[13px] font-bold text-zinc-700 group-hover:text-zinc-900 transition-colors">
                        Back to Dashboard
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-0.5">Go to main dashboard</span>
                    </span>
                  </button>
                  <div className="border-t border-zinc-100" />
                  <button
                    type="button"
                    onClick={() => {
                      void router.navigate({
                        to: "/inventory/goods-issue" as any,
                        viewTransition: true,
                      });
                    }}
                    className="group flex w-full items-start gap-3 px-3 py-2.5 hover:bg-zinc-50 transition-all text-left cursor-pointer"
                  >
                    <Table className="mt-0.5 h-4 w-4 text-zinc-400 group-hover:text-zinc-655 transition-colors" />
                    <span className="flex flex-col">
                      <span className="text-[13px] font-bold text-zinc-700 group-hover:text-zinc-900 transition-colors">
                        Back to Table
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-0.5">Go to document table</span>
                    </span>
                  </button>
                </div>
              </Popover.Content>
            </Popover.Root>
          </div>

          {/* Right Side: Add Actions */}
          <div className="flex items-center gap-2">
            <Popover.Root>
              <Popover.Trigger asChild>
                <Button
                  type="button"
                  size="md"
                  variant="outline"
                  isLoading={createMutation.isPending}
                  loadingText="Adding..."
                  className="group h-11 w-52 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 focus:outline-none flex items-center justify-between cursor-pointer normal-case tracking-normal"
                >
                  <span className="inline-flex items-center gap-2">
                    <span>Add</span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-zinc-400 transition-transform duration-200" />
                </Button>
              </Popover.Trigger>
              <Popover.Content
                side="top"
                align="end"
                unstyled
                className="w-52 z-[1001] -translate-x-3"
              >
                <div className="overflow-hidden rounded-xl border border-zinc-100 bg-white text-zinc-900 shadow-xl ring-1 ring-black/5 min-w-50">
                  <div className="flex flex-col gap-0.5 p-1.5 w-52 bg-white">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Document Actions
                    </div>
                    <div className="border-t border-zinc-100 my-1" />

                    <button
                      type="button"
                      onClick={() => handleAdd("save-new")}
                      disabled={createMutation.isPending}
                      className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-zinc-700 hover:text-blue-600 transition-all cursor-pointer border-none"
                    >
                      <Plus className="h-4 w-4 text-zinc-400 transition-colors group-hover:text-blue-600" />
                      <span>Save & New</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAdd("view")}
                      disabled={createMutation.isPending}
                      className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-zinc-700 hover:text-blue-600 transition-all cursor-pointer border-none"
                    >
                      <Eye className="h-4 w-4 text-zinc-400 transition-colors group-hover:text-blue-600" />
                      <span>Save & View</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAdd("close")}
                      disabled={createMutation.isPending}
                      className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-zinc-700 hover:text-blue-600 transition-all cursor-pointer border-none"
                    >
                      <CheckSquare className="h-4 w-4 text-zinc-400 transition-colors group-hover:text-blue-600" />
                      <span>Save & Close</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAdd("draft")}
                      disabled={createMutation.isPending}
                      className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-zinc-700 hover:text-blue-600 transition-all cursor-pointer border-none"
                    >
                      <FileText className="h-4 w-4 text-zinc-400 transition-colors group-hover:text-blue-600" />
                      <span>Save & Draft</span>
                    </button>
                  </div>
                </div>
              </Popover.Content>
            </Popover.Root>
          </div>
        </div>
      </div>
    </CreatePageWrapper>
  );
}
