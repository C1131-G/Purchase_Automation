import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { incomingPayments } from "@/db/schema/incoming-payments";
import { outgoingPayments } from "@/db/schema/outgoing-payments";

const formatDate = (date: Date): string => date.toISOString().split("T")[0];

const getDocDate = (index: number, total: number) => {
  const daysAgo = Math.floor((index / total) * 365);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};

export async function seedPaymentDocs(
  db: NodePgDatabase<Record<string, never>>,
  seedCurrency: string,
  bpVendors: any[],
  bpCustomers: any[],
  apInvoiceEntries: any[],
  arInvoiceEntries: any[],
) {
  // 10. Outgoing Payments (60 rows) - pays AP Invoices
  const opValues: any[] = [];
  for (let i = 1; i <= 60; i += 1) {
    const businessPartner = bpVendors[i % bpVendors.length];
    const docDate = getDocDate(i, 60);
    const apInvoice = apInvoiceEntries[i % apInvoiceEntries.length];

    opValues.push({
      cardCode: businessPartner.code,
      cardName: businessPartner.name,
      docCurrency: seedCurrency,
      docDate: formatDate(docDate),
      docNum: 30_000 + i,
      docTotal: apInvoice.total.toString(),
      paymentMode: "Cash",
    });
  }
  if (opValues.length > 0) {
    await db.insert(outgoingPayments).values(opValues);
  }

  // 11. Incoming Payments (60 rows) - pays AR Invoices
  const ipValuesList: any[] = [];
  for (let i = 1; i <= 60; i += 1) {
    const businessPartner = bpCustomers[i % bpCustomers.length];
    const docDate = getDocDate(i, 60);
    const arInvoice = arInvoiceEntries[i % arInvoiceEntries.length];

    ipValuesList.push({
      cardCode: businessPartner.code,
      cardName: businessPartner.name,
      docCurrency: seedCurrency,
      docDate: formatDate(docDate),
      docNum: 40_000 + i,
      docTotal: arInvoice.total.toString(),
      paymentMode: "Cash",
    });
  }
  if (ipValuesList.length > 0) {
    await db.insert(incomingPayments).values(ipValuesList);
  }
}
