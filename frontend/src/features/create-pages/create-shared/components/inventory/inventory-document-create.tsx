import { useState } from "react";
import type { ComponentType } from "react";
import { CreatePageWrapper } from "@/features/create-pages/create-shared/components/layout/create-page-wrapper";
import { InventoryDocumentHeader } from "@/features/create-pages/create-shared/components/inventory/inventory-document-header";
import { InventoryDocumentFooter } from "@/features/create-pages/create-shared/components/inventory/inventory-document-footer";
import { InventoryDocumentActions } from "@/features/create-pages/create-shared/components/inventory/inventory-document-actions";
import { InventoryDocumentAttachments } from "@/features/create-pages/create-shared/components/inventory/inventory-document-attachments";
import type { AttachmentItem } from "@/features/create-pages/create-shared/components/inventory/types/inventory-document.types";

type InventoryDocumentType = "goods-receipt" | "goods-issue";

interface InventoryDocumentCreateProps<TRow> {
  pageTitle: string;
  breadcrumbTo: string;
  breadcrumbLabel?: string;
  documentType: InventoryDocumentType;
  journalRemarkPlaceholder?: string;
  tableComponent: ComponentType<{ rows: TRow[]; onRowsChange: (rows: TRow[]) => void }>;
  attachmentTargetPathPrefix?: string;
}

const ID_PREFIX: Record<InventoryDocumentType, string> = {
  "goods-receipt": "gr",
  "goods-issue": "gi",
};

export function InventoryDocumentCreate<TRow>({
  pageTitle,
  breadcrumbTo,
  breadcrumbLabel,
  documentType,
  journalRemarkPlaceholder,
  tableComponent: TableComponent,
  attachmentTargetPathPrefix,
}: InventoryDocumentCreateProps<TRow>) {
  const [activeTab, setActiveTab] = useState<"contents" | "attachments">("contents");

  const [number, setNumber] = useState("");
  const [series, setSeries] = useState("");
  const [priceList, setPriceList] = useState("");

  const [postingDate, setPostingDate] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [ref2, setRef2] = useState("");

  const [remarks, setRemarks] = useState("");
  const [journalRemark, setJournalRemark] = useState("");

  const [rows, setRows] = useState<TRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  const idPrefix = ID_PREFIX[documentType];

  return (
    <CreatePageWrapper
      dashboardUrl="/dashboard/inventory"
      breadcrumbParent={{
        label: breadcrumbLabel ?? "Inventory Documents",
        to: breadcrumbTo,
      }}
      pageTitle={pageTitle}
    >
      <div className="space-y-4">
        {/* ── Header Section ── */}
        <InventoryDocumentHeader
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
          idPrefix={idPrefix}
        />

        {/* ── Tabs ── */}
        <div className="flex border-b border-zinc-200">
          <button
            type="button"
            id={`${idPrefix}-tab-contents`}
            className={`cursor-pointer border-b-2 px-4 py-2.5 text-sm font-semibold outline-none transition ${
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
            id={`${idPrefix}-tab-attachments`}
            className={`cursor-pointer border-b-2 px-4 py-2.5 text-sm font-semibold outline-none transition ${
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
          <TableComponent rows={rows} onRowsChange={setRows} />
        ) : (
          <InventoryDocumentAttachments
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            idPrefix={idPrefix}
            targetPathPrefix={attachmentTargetPathPrefix ?? "C:\\Attachments\\"}
          />
        )}

        {/* ── Footer (Remarks + Journal Remark) ── */}
        <InventoryDocumentFooter
          remarks={remarks}
          journalRemark={journalRemark}
          onRemarksChange={setRemarks}
          onJournalRemarkChange={setJournalRemark}
          idPrefix={idPrefix}
          journalRemarkPlaceholder={journalRemarkPlaceholder ?? "Journal Remark"}
        />

        {/* ── Action Buttons ── */}
        <InventoryDocumentActions idPrefix={idPrefix} />
      </div>
    </CreatePageWrapper>
  );
}
