import { faker } from "@faker-js/faker";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { apCreditMemoLines } from "@/db/schema/ap-credit-memo-lines";
import { apCreditMemos } from "@/db/schema/ap-credit-memos";
import { apInvoiceLines } from "@/db/schema/ap-invoice-lines";
import { apInvoices } from "@/db/schema/ap-invoices";
import { grpo } from "@/db/schema/grpo";
import { grpoLines } from "@/db/schema/grpo-lines";

const formatDate = (date: Date): string => date.toISOString().split("T")[0];

const getDocDate = (index: number, total: number) => {
  const daysAgo = Math.floor((index / total) * 365);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};

const getRandomItems = (items: any[], count: number) => {
  const shuffled = [...items].toSorted(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export async function seedPurchaseBillingDocs(
  db: NodePgDatabase<Record<string, never>>,
  tenant: { prefix: string },
  seedCurrency: string,
  bpVendors: any[],
  items: any[],
  poEntries: number[],
) {
  // 3. GRPOs (100 rows)
  const grpoHeaders: any[] = [];
  const grpoLinesSpec: any[] = [];
  for (let i = 1; i <= 100; i += 1) {
    const businessPartner = bpVendors[i % bpVendors.length];
    const docDate = getDocDate(i, 100);
    const selectedItems = getRandomItems(items, 2);

    let docTotal = 0;
    const lineItems: any[] = [];
    selectedItems.forEach((item) => {
      const qty = faker.number.int({ max: 20, min: 1 });
      const price = Number.parseFloat(item.lastPurchasePrice);
      docTotal += qty * price;
      lineItems.push({ item, price, qty });
    });

    grpoHeaders.push({
      address: businessPartner.billToAddress,
      cardCode: businessPartner.code,
      cardName: businessPartner.name,
      comments: `Seeded GRPO ${i}`,
      docCurrency: seedCurrency,
      docDate: formatDate(docDate),
      docDueDate: formatDate(new Date(docDate.getTime() + 14 * 24 * 60 * 60 * 1000)),
      docNum: 10_000 + i,
      docStatus: "O",
      docTotal: docTotal.toString(),
    });
    grpoLinesSpec.push(lineItems);
  }
  const seededGRPOs = await db.insert(grpo).values(grpoHeaders).returning();

  const grpoLinesToInsert: any[] = [];
  seededGRPOs.forEach((goodsReceipt, index) => {
    const specs = grpoLinesSpec[index];
    specs.forEach((spec: any, lineIndex: number) => {
      grpoLinesToInsert.push({
        baseEntry: poEntries[index % poEntries.length],
        baseLine: lineIndex,
        baseType: 22,
        docEntry: goodsReceipt.id,
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
  if (grpoLinesToInsert.length > 0) {
    await db.insert(grpoLines).values(grpoLinesToInsert);
  }

  // 4. AP Invoices (120 rows)
  const apInvoiceHeaders: any[] = [];
  const apInvoiceLinesSpec: any[] = [];
  for (let i = 1; i <= 120; i += 1) {
    const businessPartner = bpVendors[i % bpVendors.length];
    const docDate = getDocDate(i, 120);
    const selectedItems = getRandomItems(items, 2);

    let docTotal = 0;
    const lineItems: any[] = [];
    selectedItems.forEach((item) => {
      const qty = faker.number.int({ max: 20, min: 1 });
      const price = Number.parseFloat(item.lastPurchasePrice);
      docTotal += qty * price;
      lineItems.push({ item, price, qty });
    });

    apInvoiceHeaders.push({
      address: businessPartner.billToAddress,
      cardCode: businessPartner.code,
      cardName: businessPartner.name,
      docCurrency: seedCurrency,
      docDate: formatDate(docDate),
      docDueDate: formatDate(new Date(docDate.getTime() + 30 * 24 * 60 * 60 * 1000)),
      docNum: 10_000 + i,
      docStatus: i % 2 === 0 ? "C" : "O",
      docTotal: docTotal.toString(),
      paidToDate: (i % 2 === 0 ? docTotal : 0).toString(),
    });
    apInvoiceLinesSpec.push(lineItems);
  }
  const seededAPInvoices = await db.insert(apInvoices).values(apInvoiceHeaders).returning();
  const apInvoiceEntries = seededAPInvoices.map((apInvoice) => ({
    id: apInvoice.id,
    total: Number.parseFloat(apInvoice.docTotal || "0"),
  }));

  const apLinesToInsert: any[] = [];
  seededAPInvoices.forEach((apInvoice, index) => {
    const specs = apInvoiceLinesSpec[index];
    specs.forEach((spec: any, lineIndex: number) => {
      apLinesToInsert.push({
        docEntry: apInvoice.id,
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
  if (apLinesToInsert.length > 0) {
    await db.insert(apInvoiceLines).values(apLinesToInsert);
  }

  // 5. AP Credit Memos (50 rows)
  const apCMHeaders: any[] = [];
  const apCMLinesSpec: any[] = [];
  for (let i = 1; i <= 50; i += 1) {
    const businessPartner = bpVendors[i % bpVendors.length];
    const docDate = getDocDate(i, 50);
    const selectedItems = getRandomItems(items, 1);

    let docTotal = 0;
    const lineItems: any[] = [];
    selectedItems.forEach((item) => {
      const qty = faker.number.int({ max: 5, min: 1 });
      const price = Number.parseFloat(item.lastPurchasePrice);
      docTotal += qty * price;
      lineItems.push({ item, price, qty });
    });

    apCMHeaders.push({
      address: businessPartner.billToAddress,
      cardCode: businessPartner.code,
      cardName: businessPartner.name,
      comments: `Seeded credit memo ${i}`,
      docCurrency: seedCurrency,
      docDate: formatDate(docDate),
      docDueDate: formatDate(docDate),
      docNum: 10_000 + i,
      docStatus: "C",
      docTotal: docTotal.toString(),
    });
    apCMLinesSpec.push(lineItems);
  }
  const seededAPCMs = await db.insert(apCreditMemos).values(apCMHeaders).returning();

  const apCMLinesToInsert: any[] = [];
  seededAPCMs.forEach((creditMemo, index) => {
    const specs = apCMLinesSpec[index];
    specs.forEach((spec: any, lineIndex: number) => {
      apCMLinesToInsert.push({
        docEntry: creditMemo.id,
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
  if (apCMLinesToInsert.length > 0) {
    await db.insert(apCreditMemoLines).values(apCMLinesToInsert);
  }

  return apInvoiceEntries;
}
