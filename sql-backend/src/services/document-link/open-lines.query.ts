import { and, asc, eq, sql } from "drizzle-orm";

import type { LooseDb } from "@/types/db.types";
import type { DynRow } from "@/types/drizzle.types";

import { DOCUMENT_REGISTRY } from "./document-link.registry";
import { calculateOpenQty } from "./open-qty.calculator";

/**
 * Generic retrieval of open document lines for a cardCode, supporting any parentType in the registry.
 */
export async function getOpenLinesForDocType(
  db: LooseDb,
  parentType: number,
  cardCode: string,
): Promise<DynRow[]> {
  const registryEntry = DOCUMENT_REGISTRY[parentType];
  if (!registryEntry) {
    throw new Error(`Unsupported document type ${parentType}`);
  }

  const parentDocs = await db
    .select({
      id: registryEntry.headerTable.id,
      docNum: registryEntry.headerTable.docNum,
      docDate: registryEntry.headerTable.docDate,
      docCurrency: registryEntry.headerTable.docCurrency,
      discountPercent: registryEntry.headerTable.discountPercent,
    })
    .from(registryEntry.headerTable)
    .where(
      and(
        eq(registryEntry.headerTable.cardCode, cardCode),
        eq(registryEntry.headerTable.docStatus, "O"),
        sql`COALESCE(${registryEntry.headerTable.canceled}, 'N') <> 'Y'`,
      ),
    );

  const openLines: DynRow[] = [];

  for (const doc of parentDocs) {
    const parentDocLines = await db
      .select()
      .from(registryEntry.lineTable)
      .where(eq(registryEntry.lineTable.docEntry, doc.id))
      .orderBy(asc(registryEntry.lineTable.lineNum));

    for (const docLine of parentDocLines) {
      const openQty = await calculateOpenQty(
        db,
        parentType,
        doc.id,
        docLine.lineNum,
        Number(docLine.quantity || 0),
      );
      if (openQty > 0) {
        const openLineItem: DynRow = {
          discountPercent: Number(docLine.discountPercent || doc.discountPercent || 0),
          docCurr: doc.docCurrency || "",
          docDate: doc.docDate,
          docEntry: doc.id,
          docNum: doc.docNum,
          itemCode: docLine.itemCode,
          itemDescription: docLine.itemDescription || "",
          lineNum: docLine.lineNum,
          lineTotal: Number(docLine.lineTotal || 0),
          openQty,
          price: Number(docLine.unitPrice || 0),
          quantity: Number(docLine.quantity || 0),
          uoMCode: docLine.uomCode || "",
          warehouseCode: docLine.warehouseCode || "",
        };

        if (parentType === 540_000_006) {
          openLineItem.vatGroup = docLine.vatGroup || "";
          openLineItem.vatPrcnt = 0;
        }

        openLines.push(openLineItem);
      }
    }
  }

  return openLines;
}
