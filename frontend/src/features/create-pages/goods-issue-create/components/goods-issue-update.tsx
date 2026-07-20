import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { ArrowLeft, ChevronDown, LayoutDashboard, Table } from "lucide-react";
import { useState, useEffect } from "react";
import { ActionsPopoverContent } from "@/features/create-pages/create-shared/components/sections/base-product-section";

import { Button } from "@/components/button";
import { Popover } from "@/components/popover";
import { CreatePageWrapper } from "@/features/create-pages/create-shared/components/layout/create-page-wrapper";
import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";
import { UploadGrid } from "@/features/create-pages/create-shared/components/grids/upload-grid";
import { InventoryDocumentFooter } from "@/features/create-pages/create-shared/components/inventory/inventory-document-footer";
import { InventoryDocumentHeader } from "@/features/create-pages/create-shared/components/inventory/inventory-document-header";
import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import type { GoodsIssueRow } from "@/features/create-pages/goods-issue-create/types/goods-issue.types";
import { GoodsIssueTable } from "@/features/create-pages/goods-issue-create/components/goods-issue-table";
import {
  notifyActionError,
  notifyActionSuccess,
} from "@/features/create-pages/create-shared/utils/create-feedback-toast";
import { goodsIssueQueries } from "@/features/table-pages/goods-issue/api/goods-issue.queries";
import type { AttachmentItem } from "@/features/create-pages/create-shared/components/grids/upload-grid";
import { apiClient } from "@/shared/api/client";

interface GoodsIssueUpdateProps {
  docNum: string;
}

// ─── SAP mutation ────────────────────────────────────────────────────────────

interface UpdateGoodsIssuePayload {
  Comments?: string;
  JrnlMemo?: string;
  Ref2?: string;
  Attachments?: any[];
}

function useUpdateGoodsIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateGoodsIssuePayload }) => {
      return apiClient<{ success: boolean; data: any }>(`/api/v1/goods-issues/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goodsIssueQueries.list({}).queryKey });
    },
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GoodsIssueUpdate({ docNum }: GoodsIssueUpdateProps) {
  const router = useRouter();
  const [remarks, setRemarks] = useState("");
  const [journalRemark, setJournalRemark] = useState("");
  const [ref2, setRef2] = useState("");
  const [rows, setRows] = useState<GoodsIssueRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [branch, setBranch] = useState("");

  const updateMutation = useUpdateGoodsIssue();

  // Load GR detail data
  const {
    data: grDetail,
    isLoading: grLoading,
    isError: grError,
  } = useQuery(goodsIssueQueries.detailById(docNum));

  const warehousesQuery = useQuery(createSharedQueries.warehouses());
  const uomsQuery = useQuery(createSharedQueries.uoms());
  const seriesQuery = useQuery(createSharedQueries.series("59"));
  const priceListsQuery = useQuery(createSharedQueries.priceLists());
  const branchesQuery = useQuery(createSharedQueries.branches());
  const reasonsQuery = useQuery(createSharedQueries.inventoryAdjustmentReasons("issue"));

  const grData = grDetail?.data;

  // Map backend lines to GoodsIssueRow format once on load
  useEffect(() => {
    if (grData?.DocumentLines) {
      setRemarks(grData.Comments || "");
      setJournalRemark(grData.JrnlMemo || "");
      setRef2(grData.Ref2 || "");
      if (grData.DocumentLines?.length > 0) {
        setBranch(grData.DocumentLines[0].CostingCode || grData.DocumentLines[0].OcrCode || "");
      }

      const mappedRows = grData.DocumentLines.map((line: any, idx: number) => {
        const binAlloc = line.DocumentLinesBinAllocations?.[0]?.BinAbsEntry ?? 0;
        const qty = Number(line.Quantity || 0);
        const price = Number(line.Price ?? line.UnitPrice ?? 0);
        return {
          id: line.LineNum !== undefined ? String(line.LineNum) : `line-${idx}`,
          itemNo: line.ItemCode || "",
          itemDescription: line.Dscription || line.ItemDescription || "",
          uomCode: line.UomCode || line.UoMCode || "",
          uomName: line.unitMsr || line.UomCode || line.UoMCode || "",
          whse: line.WhsCode || line.WarehouseCode || "",
          quantity: qty,
          unitPrice: String(price),
          total: (qty * price).toFixed(2),
          binLocationAllocation: binAlloc,
          accountCode: line.AcctCode || line.AccountCode || "",
          costingCode: line.CostingCode || line.OcrCode || "",
          inventoryAdjustmentReason: line.InventoryAdjustmentReason || "",
        };
      });
      setRows(mappedRows);
      if (grData.Attachments) {
        setAttachments(grData.Attachments);
      }
    }
  }, [grData]);

  if (grLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (grError || !grData) {
    return (
      <div className="p-6 text-center">
        <div className="text-sm font-semibold text-red-500">
          Failed to load Goods Issue details.
        </div>
        <Button onClick={() => router.history.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const branchName = branchesQuery.data?.find((b) => b.code === branch)?.name || branch || "N/A";

  return (
    <CreatePageWrapper
      dashboardUrl="/dashboard/inventory"
      breadcrumbParent={{ label: "Goods Issue Data Table", to: "/inventory/goods-issue" }}
      pageTitle={`Goods Issue #${grData.DocNum}`}
    >
      <div className="space-y-4">
        {/* Header - Read Only (except Ref2 maybe) */}
        <div>
          <InventoryDocumentHeader
            series={String(grData.Series || "")}
            seriesOptions={seriesQuery.data ?? []}
            seriesLoading={seriesQuery.isLoading}
            priceList={
              grData.PriceList
                ? priceListsQuery.data?.find((pl) => pl.code === String(grData.PriceList))?.name ||
                  (grData.PriceList === -2 ? "Last Evaluated Price" : "Last Purchase Price")
                : "Last Purchase Price"
            }
            priceLists={[]}
            priceListsLoading={false}
            postingDate={grData.DocDate ? grData.DocDate.slice(0, 10) : ""}
            documentDate={grData.TaxDate ? grData.TaxDate.slice(0, 10) : ""}
            ref2={ref2}
            number={String(grData.DocNum || "")}
            onNumberChange={() => {}}
            onSeriesChange={() => {}}
            onPriceListChange={() => {}}
            onPostingDateChange={() => {}}
            onDocumentDateChange={() => {}}
            onRef2Change={setRef2}
            idPrefix="gi-view"
            isEditMode={true}
          >
            <div>
              <label className="mb-1.5 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Branch
              </label>
              <input
                type="text"
                value={branchesQuery.isLoading ? "Loading..." : branchName}
                readOnly
                disabled
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-100 pl-3 pr-8 text-sm text-zinc-500 outline-none cursor-not-allowed"
              />
            </div>
          </InventoryDocumentHeader>
        </div>

        {/* Contents Section */}
        <div>
          <GoodsIssueTable
            rows={rows}
            onRowsChange={setRows}
            openProductPopup={() => {}}
            prefetchProducts={() => {}}
            warehouses={warehousesQuery.data ?? []}
            warehousesLoading={warehousesQuery.isLoading}
            uoms={uomsQuery.data ?? []}
            reasons={reasonsQuery.data ?? []}
            priceListCode={undefined}
          />
        </div>

        {/* Attachments Section Card */}
        <div className="mt-3">
          <SectionCard title="ATTACHMENTS">
            <UploadGrid
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              moduleName="GoodsIssue"
              readOnly={true}
            />
          </SectionCard>
        </div>

        {/* Footer - Editable */}
        <div>
          <InventoryDocumentFooter
            remarks={remarks}
            journalRemark={journalRemark}
            onRemarksChange={setRemarks}
            onJournalRemarkChange={setJournalRemark}
            idPrefix="gi-view"
          />
        </div>

        {/* Go Back / Update Actions */}
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
                        search: { limit: 10, page: 1 } as any,
                        to: "/inventory/goods-issue",
                        viewTransition: true,
                      });
                    }}
                    className="group flex w-full items-start gap-3 px-3 py-2.5 hover:bg-zinc-50 transition-all text-left cursor-pointer"
                  >
                    <Table className="mt-0.5 h-4 w-4 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
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

          {/* Right Side: Actions Button */}
          <div className="flex items-center gap-2">
            <Popover.Root>
              <Popover.Trigger asChild>
                <Button
                  type="button"
                  size="md"
                  variant="outline"
                  className="group h-11 w-[180px] rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 focus:outline-none flex items-center justify-between cursor-pointer normal-case tracking-normal"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 flex items-center justify-center text-zinc-400 group-hover:text-zinc-500 font-bold">
                      ⚙
                    </span>
                    <span>Actions</span>
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 text-zinc-400 group-hover:text-zinc-600 transition-transform duration-200" />
                </Button>
              </Popover.Trigger>
              <Popover.Content
                side="top"
                align="end"
                unstyled
                className="w-[180px] z-[1001] -translate-x-3"
              >
                <div className="overflow-hidden rounded-xl border border-zinc-100 bg-white text-zinc-900 shadow-xl ring-1 ring-black/5 min-w-50">
                  <ActionsPopoverContent
                    onSubmit={() => {
                      if (!grData) return;
                      updateMutation.mutate(
                        {
                          id: grData.DocEntry,
                          payload: {
                            Comments: remarks,
                            JrnlMemo: journalRemark,
                            Ref2: ref2,
                            ...(attachments.length > 0 ? { Attachments: attachments } : {}),
                          },
                        },
                        {
                          onSuccess: () => {
                            notifyActionSuccess(
                              `Goods issue #${docNum} updated`,
                              "goods-issue-update",
                            );
                          },
                          onError: (error: unknown) => {
                            notifyActionError(
                              error,
                              "Failed to update goods issue.",
                              "goods-issue-update",
                            );
                          },
                        },
                      );
                    }}
                    onDownload={() => {}}
                    isSubmitting={updateMutation.isPending}
                    submitDisabled={false}
                  />
                </div>
              </Popover.Content>
            </Popover.Root>
          </div>
        </div>
      </div>
    </CreatePageWrapper>
  );
}
