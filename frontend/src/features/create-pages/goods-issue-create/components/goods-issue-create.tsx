import { useState } from "react";
import { CreatePageWrapper } from "@/features/create-pages/create-shared/components/layout/create-page-wrapper";
import { GoodsIssueHeader } from "@/features/create-pages/goods-issue-create/components/goods-issue-header";
import { GoodsIssueTable } from "@/features/create-pages/goods-issue-create/components/goods-issue-table";
import { GoodsIssueFooter } from "@/features/create-pages/goods-issue-create/components/goods-issue-footer";
import { GoodsIssueActions } from "@/features/create-pages/goods-issue-create/components/goods-issue-actions";
import {
  GoodsIssueAttachments,
  type GoodsIssueAttachmentItem,
} from "@/features/create-pages/goods-issue-create/components/goods-issue-attachments";
import type { GoodsIssueRow } from "@/features/create-pages/goods-issue-create/types/goods-issue.types";

/**
 * GoodsIssueCreate: Top-level orchestrator for the Goods Issue entry form.
 * Mirrors the Goods Receipt page structure; Unit Price and Total columns are excluded.
 */
export function GoodsIssueCreate() {
  const [activeTab, setActiveTab] = useState<"contents" | "attachments">("contents");

  const [number, setNumber] = useState("");
  const [series, setSeries] = useState("");
  const [priceList, setPriceList] = useState("");

  const [postingDate, setPostingDate] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [ref2, setRef2] = useState("");

  const [remarks, setRemarks] = useState("");
  const [journalRemark, setJournalRemark] = useState("");

  const [rows, setRows] = useState<GoodsIssueRow[]>([]);
  const [attachments, setAttachments] = useState<GoodsIssueAttachmentItem[]>([]);

  return (
    <CreatePageWrapper
      dashboardUrl="/dashboard/inventory-adjustment"
      breadcrumbParent={{
        label: "Inventory Documents",
        to: "/inventory/goods-issue",
      }}
      pageTitle="Create Goods Issue"
    >
      <div className="space-y-4">
        {/* ── Header Section ── */}
        <GoodsIssueHeader
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
            id="gi-tab-contents"
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
            id="gi-tab-attachments"
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
          <GoodsIssueTable rows={rows} onRowsChange={setRows} />
        ) : (
          <GoodsIssueAttachments attachments={attachments} onAttachmentsChange={setAttachments} />
        )}

        {/* ── Footer (Remarks + Journal Remark) ── */}
        <GoodsIssueFooter
          remarks={remarks}
          journalRemark={journalRemark}
          onRemarksChange={setRemarks}
          onJournalRemarkChange={setJournalRemark}
        />

        {/* ── Action Buttons ── */}
        <GoodsIssueActions />
      </div>
    </CreatePageWrapper>
  );
}
