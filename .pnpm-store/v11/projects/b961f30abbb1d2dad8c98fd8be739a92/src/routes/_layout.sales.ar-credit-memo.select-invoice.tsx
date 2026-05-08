import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Suspense } from "react";

import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { ARInvoiceTable } from "@/features/table-pages/ar-invoices/components/ar-invoice-table";
import { arInvoiceSearchSchema } from "@/features/table-pages/ar-invoices/schemas/ar-invoice-search.schema";

export const Route = createFileRoute("/_layout/sales/ar-credit-memo/select-invoice")({
  component: SelectInvoicePage,
  validateSearch: (search) => arInvoiceSearchSchema.parse(search),
});

function SelectInvoicePage() {
  const navigate = useNavigate();

  const handleInvoiceSelect = (docNum: string) => {
    void navigate({
      search: {
        sourceDocNum: docNum,
        sourceDocType: "AR_INVOICE" as const,
      },
      to: "/sales/ar-credit-memo/create",
    } as never);
  };

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="border-b border-zinc-100 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() =>
              void navigate({
                search: { limit: 10, page: 1 },
                to: "/sales/ar-credit-memo",
              } as never)
            }
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition-all hover:bg-zinc-50 hover:text-zinc-800 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-zinc-900">
              select an invoice to create AR Credit Memo
            </h1>
            <p className="text-sm text-zinc-500">
              Select an open invoice from the list below to use as a source document.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<TableSkeleton />}>
          <ARInvoiceTable
            onRowClick={(row) => handleInvoiceSelect(String(row.DocNum))}
            titleOverride="Choose an invoice"
            hideCreate={true}
          />
        </Suspense>
      </div>
    </div>
  );
}
