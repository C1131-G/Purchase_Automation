import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ArCreditMemoCreate } from "@/features/create-pages/ar-credit-memo-create/components/ar-credit-memo-create";
import { useDocumentTitle } from "@/hooks/use-document-title";

export const Route = createFileRoute("/_layout/sales/ar-credit-memo/create")({
  component: ArCreditMemoCreatePage,
  validateSearch: (search) =>
    z
      .object({
        sourceDocNum: z.string().or(z.number()).transform(String).optional(),
        sourceDocType: z
          .enum(["SalesQuotation", "SalesOrder", "ARInvoice", "ARCreditNote", "AR_INVOICE"])
          .optional(),
      })
      .parse(search),
});

function ArCreditMemoCreatePage() {
  const { sourceDocNum, sourceDocType } = Route.useSearch();
  useDocumentTitle("Create AR Credit Memo | ERP Portal");
  return <ArCreditMemoCreate sourceDocNum={sourceDocNum} sourceDocType={sourceDocType} />;
}
