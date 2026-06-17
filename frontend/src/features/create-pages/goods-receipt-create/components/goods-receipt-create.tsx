import { useState } from "react";
import { CreatePageWrapper } from "@/features/create-pages/create-shared/components/layout/create-page-wrapper";
import { GoodsReceiptHeader } from "@/features/create-pages/goods-receipt-create/components/goods-receipt-header";
import { GoodsReceiptTable } from "@/features/create-pages/goods-receipt-create/components/goods-receipt-table";
import { GoodsReceiptFooter } from "@/features/create-pages/goods-receipt-create/components/goods-receipt-footer";
import { GoodsReceiptActions } from "@/features/create-pages/goods-receipt-create/components/goods-receipt-actions";
import { GoodsReceiptAttachments, type AttachmentItem } from "@/features/create-pages/goods-receipt-create/components/goods-receipt-attachments";
import type { GoodsReceiptRow } from "@/features/create-pages/goods-receipt-create/types/goods-receipt.types";

/**
 * GoodsReceiptCreate: Top-level orchestrator for the Goods Receipt entry form.
 * Refactored to match standard Tailwind/design system of the application.
 */
export function GoodsReceiptCreate() {
  const [activeTab, setActiveTab] = useState<"contents" | "attachments">("contents");

  const [number, setNumber] = useState("");
  const [series, setSeries] = useState("");
  const [priceList, setPriceList] = useState("");

  const [postingDate, setPostingDate] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [ref2, setRef2] = useState("");

  const [remarks, setRemarks] = useState("");
  const [journalRemark, setJournalRemark] = useState("");

  const [rows, setRows] = useState<GoodsReceiptRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  return (
    <CreatePageWrapper
      dashboardUrl="/dashboard/inventory-adjustment"
      breadcrumbParent={{
        label: "Inventory Documents",
        to: "/inventory/goods-receipt",
      }}
      pageTitle="Create Goods Receipt"
    >
      <div className="space-y-4">
        {/* ── Header Section ── */}
        <GoodsReceiptHeader
          number={number}
          series={series}
          priceList={priceList}
          postingDate={postingDate}
          documentDate={documentDate}
          ref2={ref2}
          onNumberChange={setNumber}
          onSeriesChange={setSeries}
          onPriceListChange={setPriceList}
          onPostingDateChange={setPostingDate}
          onDocumentDateChange={setDocumentDate}
          onRef2Change={setRef2}
        />

        {/* ── Tabs ── */}
        <div className="flex border-b border-zinc-200">
          <button
            type="button"
            id="tab-contents"
            className={`px-4 py-2.5 text-sm font-semibold transition border-b-2 outline-none cursor-pointer ${
              activeTab === "contents"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
            onClick={() => setActiveTab("contents")}
          >
            Contents
          </button>
          <button
            type="button"
            id="tab-attachments"
            className={`px-4 py-2.5 text-sm font-semibold transition border-b-2 outline-none cursor-pointer ${
              activeTab === "attachments"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
            onClick={() => setActiveTab("attachments")}
          >
            Attachments
          </button>
        </div>

        {/* ── Table / Attachments panel ── */}
        {activeTab === "contents" ? (
          <GoodsReceiptTable rows={rows} onRowsChange={setRows} />
        ) : (
          <GoodsReceiptAttachments
            attachments={attachments}
            onAttachmentsChange={setAttachments}
          />
        )}

        {/* ── Footer (Remarks + Journal Remark) ── */}
        <GoodsReceiptFooter
          remarks={remarks}
          journalRemark={journalRemark}
          onRemarksChange={setRemarks}
          onJournalRemarkChange={setJournalRemark}
        />

        {/* ── Action Buttons ── */}
        <GoodsReceiptActions />
      </div>
    </CreatePageWrapper>
  );
}
