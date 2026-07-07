import { useState } from "react";
import { CreatePageWrapper } from "@/features/create-pages/create-shared/components/layout/create-page-wrapper";
import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";
import { InventoryDocumentHeader } from "@/features/create-pages/create-shared/components/inventory/inventory-document-header";
import { InventoryDocumentFooter } from "@/features/create-pages/create-shared/components/inventory/inventory-document-footer";
import { InventoryDocumentActions } from "@/features/create-pages/create-shared/components/inventory/inventory-document-actions";
import { InventoryLineTable } from "@/features/create-pages/create-shared/components/inventory/inventory-line-table";
import type { InventoryColumn } from "@/features/create-pages/create-shared/components/inventory/inventory-line-table";

interface TransferRow {
  id: string;
  itemNo: string;
  itemDescription: string;
  uomCode: string;
  quantity: number;
  fromWhse: string;
  toWhse: string;
  unitPrice: string;
  total?: string;
}

const COLUMNS: InventoryColumn<TransferRow>[] = [
  { key: "itemNo", label: "Item No.", width: "12%", type: "text" },
  { key: "itemDescription", label: "Item Description", width: "22%", type: "text" },
  { key: "uomCode", label: "UoM Code", width: "10%", type: "text" },
  { key: "fromWhse", label: "From Whse", width: "10%", type: "text" },
  { key: "toWhse", label: "To Whse", width: "10%", type: "text" },
  { key: "quantity", label: "Quantity", width: "10%", type: "number", align: "right" },
  { key: "unitPrice", label: "Unit Price", width: "12%", type: "text", align: "right" },
  {
    key: "total",
    label: "Total",
    width: "14%",
    type: "computed",
    align: "right",
    compute: (row) => {
      const qty = Number(row.quantity) || 0;
      const priceStr = String(row.unitPrice).replace(/[^0-9.]/g, "");
      const price = parseFloat(priceStr) || 0;
      const computedTotal = qty * price;
      return computedTotal.toFixed(2);
    },
  },
];

const DEFAULT_ROW: TransferRow = {
  id: "",
  itemNo: "",
  itemDescription: "",
  uomCode: "",
  quantity: 1,
  fromWhse: "",
  toWhse: "",
  unitPrice: "",
};

interface TransferCreateProps {
  pageTitle: string;
  breadcrumbTo: string;
  isRequest?: boolean;
}

export function TransferCreate({
  pageTitle,
  breadcrumbTo,
  isRequest = false,
}: TransferCreateProps) {
  const [number, setNumber] = useState("");
  const [series, setSeries] = useState("");
  const [priceList, setPriceList] = useState("");

  const [postingDate, setPostingDate] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [ref2, setRef2] = useState("");

  const [filler, setFiller] = useState("");
  const [toWhsCode, setToWhsCode] = useState("");

  const [remarks, setRemarks] = useState("");
  const [journalRemark, setJournalRemark] = useState("");

  const [rows, setRows] = useState<TransferRow[]>([]);

  const idPrefix = isRequest ? "wtrq" : "wtr";

  const getGrandTotal = (rows: TransferRow[]) =>
    rows.reduce((sum, row) => {
      const qty = Number(row.quantity) || 0;
      const priceStr = String(row.unitPrice).replace(/[^0-9.]/g, "");
      const price = parseFloat(priceStr) || 0;
      return sum + qty * price;
    }, 0);

  return (
    <CreatePageWrapper
      dashboardUrl="/dashboard/inventory"
      breadcrumbParent={{
        label: isRequest ? "Transfer Request Data Table" : "Inventory Transfer Data Table",
        to: breadcrumbTo,
      }}
      pageTitle={pageTitle}
    >
      <div className="space-y-4">
        {/* Header fields */}
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

        {/* Warehouse Selection */}
        <div className="grid grid-cols-2 gap-4">
          <SectionCard title="From Warehouse">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                From Whs Code
              </label>
              <input
                type="text"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-3 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                value={filler}
                onChange={(e) => setFiller(e.target.value)}
                placeholder="Filler / From Warehouse"
              />
            </div>
          </SectionCard>
          <SectionCard title="To Warehouse">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                To Whs Code
              </label>
              <input
                type="text"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-3 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                value={toWhsCode}
                onChange={(e) => setToWhsCode(e.target.value)}
                placeholder="ToWhsCode / To Warehouse"
              />
            </div>
          </SectionCard>
        </div>

        {/* Rows Table */}
        <InventoryLineTable
          rows={rows}
          onRowsChange={setRows}
          defaultRow={DEFAULT_ROW}
          columns={COLUMNS}
          showGrandTotal
          getGrandTotal={(rows) => getGrandTotal(rows)}
          minWidth="1000px"
        />

        {/* Footer */}
        <InventoryDocumentFooter
          remarks={remarks}
          journalRemark={journalRemark}
          onRemarksChange={setRemarks}
          onJournalRemarkChange={setJournalRemark}
          idPrefix={idPrefix}
          journalRemarkPlaceholder={isRequest ? "Inventory Transfer Request" : "Inventory Transfer"}
        />

        {/* Action buttons */}
        <InventoryDocumentActions idPrefix={idPrefix} />
      </div>
    </CreatePageWrapper>
  );
}
