import { faker } from "@faker-js/faker";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { arCreditMemoLines } from "@/db/schema/ar-credit-memo-lines";
import { arCreditMemos } from "@/db/schema/ar-credit-memos";
import { arInvoiceLines } from "@/db/schema/ar-invoice-lines";
import { arInvoices } from "@/db/schema/ar-invoices";

import { formatSeedDate, getSeedDocDate, pickRandomItems } from "./seed.date-helpers";

export async function seedSalesBillingDocs(
  db: NodePgDatabase<Record<string, never>>,
  tenant: { prefix: string },
  seedCurrency: string,
  bpCustomers: any[],
  items: any[],
) {
  const arInvoiceHeaders: any[] = [];
  const arInvoiceLinesSpec: any[] = [];
  for (let i = 1; i <= 120; i += 1) {
    const bp = bpCustomers[i % bpCustomers.length];
    const docDate = getSeedDocDate(i, 120);
    const selectedItems = pickRandomItems(items, 2);

    let docTotal = 0;
    const lineItems: any[] = [];
    selectedItems.forEach((item) => {
      const qty = faker.number.int({ max: 20, min: 1 });
      const price = Number.parseFloat(item.avgPrice) * 1.25;
      docTotal += qty * price;
      lineItems.push({ item, price, qty });
    });

    arInvoiceHeaders.push({
      address: bp.billToAddress,
      cardCode: bp.code,
      cardName: bp.name,
      docCurrency: seedCurrency,
      docDate: formatSeedDate(docDate),
      docDueDate: formatSeedDate(new Date(docDate.getTime() + 30 * 24 * 60 * 60 * 1000)),
      docNum: 30_000 + i,
      docStatus: i % 2 === 0 ? "C" : "O",
      docTotal: docTotal.toString(),
      paidToDate: (i % 2 === 0 ? docTotal : 0).toString(),
    });
    arInvoiceLinesSpec.push(lineItems);
  }
  const seededARInvoices = await db.insert(arInvoices).values(arInvoiceHeaders).returning();
  const arInvoiceEntries = seededARInvoices.map((ar) => ({
    id: ar.id,
    total: Number.parseFloat(ar.docTotal || "0"),
  }));

  const arLinesToInsert: any[] = [];
  seededARInvoices.forEach((ar, index) => {
    arInvoiceLinesSpec[index].forEach((spec: any, lineIndex: number) => {
      arLinesToInsert.push({
        docEntry: ar.id,
        itemCode: spec.item.code,
        itemDescription: spec.item.name,
        lineNum: lineIndex,
        lineTotal: (spec.qty * spec.price).toString(),
        quantity: spec.qty.toString(),
        unitPrice: spec.price.toString(),
        uomCode: "Each",
        uomEntry: 1,
        warehouseCode: `${tenant.prefix}WH-01`,
      });
    });
  });
  if (arLinesToInsert.length > 0) {
    await db.insert(arInvoiceLines).values(arLinesToInsert);
  }

  const arCMHeaders: any[] = [];
  const arCMLinesSpec: any[] = [];
  for (let i = 1; i <= 50; i += 1) {
    const bp = bpCustomers[i % bpCustomers.length];
    const docDate = getSeedDocDate(i, 50);
    const selectedItems = pickRandomItems(items, 1);

    let docTotal = 0;
    const lineItems: any[] = [];
    selectedItems.forEach((item) => {
      const qty = faker.number.int({ max: 5, min: 1 });
      const price = Number.parseFloat(item.avgPrice) * 1.25;
      docTotal += qty * price;
      lineItems.push({ item, price, qty });
    });

    arCMHeaders.push({
      address: bp.billToAddress,
      cardCode: bp.code,
      cardName: bp.name,
      comments: `Seeded credit memo ${i}`,
      docCurrency: seedCurrency,
      docDate: formatSeedDate(docDate),
      docDueDate: formatSeedDate(docDate),
      docNum: 30_000 + i,
      docStatus: "C",
      docTotal: docTotal.toString(),
    });
    arCMLinesSpec.push(lineItems);
  }
  const seededARCMs = await db.insert(arCreditMemos).values(arCMHeaders).returning();

  const arCMLinesToInsert: any[] = [];
  seededARCMs.forEach((cm, index) => {
    arCMLinesSpec[index].forEach((spec: any, lineIndex: number) => {
      arCMLinesToInsert.push({
        docEntry: cm.id,
        itemCode: spec.item.code,
        itemDescription: spec.item.name,
        lineNum: lineIndex,
        lineTotal: (spec.qty * spec.price).toString(),
        quantity: spec.qty.toString(),
        unitPrice: spec.price.toString(),
        uomCode: "Each",
        uomEntry: 1,
        warehouseCode: `${tenant.prefix}WH-01`,
      });
    });
  });
  if (arCMLinesToInsert.length > 0) {
    await db.insert(arCreditMemoLines).values(arCMLinesToInsert);
  }

  return { arInvoiceEntries };
}
