import { faker } from "@faker-js/faker";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { arCreditMemoLines } from "@/db/schema/ar-credit-memo-lines";
import { arCreditMemos } from "@/db/schema/ar-credit-memos";
import { arInvoiceLines } from "@/db/schema/ar-invoice-lines";
import { arInvoices } from "@/db/schema/ar-invoices";
import { salesOrderLines } from "@/db/schema/sales-order-lines";
import { salesOrders } from "@/db/schema/sales-orders";
import { salesQuotationLines } from "@/db/schema/sales-quotation-lines";
import { salesQuotations } from "@/db/schema/sales-quotations";

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

export async function seedSalesDocs(
  db: NodePgDatabase<Record<string, never>>,
  tenant: { prefix: string },
  seedCurrency: string,
  bpCustomers: any[],
  items: any[],
) {
  // 1. Sales Quotations (120 rows)
  const sqHeaders: any[] = [];
  const sqLinesSpec: any[] = [];
  for (let i = 1; i <= 120; i += 1) {
    const bp = bpCustomers[i % bpCustomers.length];
    const docDate = getDocDate(i, 120);
    const selectedItems = getRandomItems(items, 2);

    let docTotal = 0;
    const lineItems: any[] = [];
    selectedItems.forEach((item) => {
      const qty = faker.number.int({ max: 20, min: 1 });
      const price = Number.parseFloat(item.avgPrice) * 1.25;
      docTotal += qty * price;
      lineItems.push({ item, price, qty });
    });

    sqHeaders.push({
      address: bp.billToAddress,
      cardCode: bp.code,
      cardName: bp.name,
      comments: `Seeded sales quotation ${i}`,
      docCurrency: seedCurrency,
      docDate: formatDate(docDate),
      docDueDate: formatDate(new Date(docDate.getTime() + 14 * 24 * 60 * 60 * 1000)),
      docNum: 30_000 + i,
      docStatus: i % 2 === 0 ? "O" : "C",
      docTotal: docTotal.toString(),
    });
    sqLinesSpec.push(lineItems);
  }
  const seededSQs = await db.insert(salesQuotations).values(sqHeaders).returning();

  const sqLinesToInsert: any[] = [];
  seededSQs.forEach((sq, index) => {
    const specs = sqLinesSpec[index];
    specs.forEach((spec: any, lineIndex: number) => {
      sqLinesToInsert.push({
        docEntry: sq.id,
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
  if (sqLinesToInsert.length > 0) {
    await db.insert(salesQuotationLines).values(sqLinesToInsert);
  }

  // 2. Sales Orders (150 rows)
  const soHeaders: any[] = [];
  const soLinesSpec: any[] = [];
  for (let i = 1; i <= 150; i += 1) {
    const bp = bpCustomers[i % bpCustomers.length];
    const docDate = getDocDate(i, 150);
    const selectedItems = getRandomItems(items, 2);

    let docTotal = 0;
    const lineItems: any[] = [];
    selectedItems.forEach((item) => {
      const qty = faker.number.int({ max: 20, min: 1 });
      const price = Number.parseFloat(item.avgPrice) * 1.25;
      docTotal += qty * price;
      lineItems.push({ item, price, qty });
    });

    soHeaders.push({
      address: bp.billToAddress,
      cardCode: bp.code,
      cardName: bp.name,
      comments: `Seeded sales order ${i}`,
      docCurrency: seedCurrency,
      docDate: formatDate(docDate),
      docDueDate: formatDate(new Date(docDate.getTime() + 14 * 24 * 60 * 60 * 1000)),
      docNum: 30_000 + i,
      docStatus: i % 15 === 0 ? "D" : i % 20 === 0 ? "C" : "O",
      docTotal: docTotal.toString(),
    });
    soLinesSpec.push(lineItems);
  }
  const seededSOs = await db.insert(salesOrders).values(soHeaders).returning();
  const soEntries = seededSOs.map((so) => so.id);

  const soLinesToInsert: any[] = [];
  seededSOs.forEach((so, index) => {
    const specs = soLinesSpec[index];
    specs.forEach((spec: any, lineIndex: number) => {
      soLinesToInsert.push({
        docEntry: so.id,
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
  if (soLinesToInsert.length > 0) {
    await db.insert(salesOrderLines).values(soLinesToInsert);
  }

  // 3. AR Invoices (120 rows)
  const arInvoiceHeaders: any[] = [];
  const arInvoiceLinesSpec: any[] = [];
  for (let i = 1; i <= 120; i += 1) {
    const bp = bpCustomers[i % bpCustomers.length];
    const docDate = getDocDate(i, 120);
    const selectedItems = getRandomItems(items, 2);

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
      docDate: formatDate(docDate),
      docDueDate: formatDate(new Date(docDate.getTime() + 30 * 24 * 60 * 60 * 1000)),
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
    const specs = arInvoiceLinesSpec[index];
    specs.forEach((spec: any, lineIndex: number) => {
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

  // 4. AR Credit Memos (50 rows)
  const arCMHeaders: any[] = [];
  const arCMLinesSpec: any[] = [];
  for (let i = 1; i <= 50; i += 1) {
    const bp = bpCustomers[i % bpCustomers.length];
    const docDate = getDocDate(i, 50);
    const selectedItems = getRandomItems(items, 1);

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
      docDate: formatDate(docDate),
      docDueDate: formatDate(docDate),
      docNum: 30_000 + i,
      docStatus: "C",
      docTotal: docTotal.toString(),
    });
    arCMLinesSpec.push(lineItems);
  }
  const seededARCMs = await db.insert(arCreditMemos).values(arCMHeaders).returning();

  const arCMLinesToInsert: any[] = [];
  seededARCMs.forEach((cm, index) => {
    const specs = arCMLinesSpec[index];
    specs.forEach((spec: any, lineIndex: number) => {
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

  return { arInvoiceEntries, soEntries };
}
