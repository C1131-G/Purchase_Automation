import { eq } from "drizzle-orm";

import type { LooseDb } from "@/types/db.types";

import { DOCUMENT_REGISTRY } from "./document-link.registry";
import { calculateOpenQty } from "./open-qty.calculator";

/**
 * Iterates through parent document IDs and sets the status to 'C' (Closed) if all lines
 * are fully consumed (open quantity is 0), or 'O' (Open) otherwise.
 */
export async function recalculateParentStatuses(
  db: LooseDb,
  parentDocEntries: Set<number>,
  parentObjType: number,
): Promise<void> {
  const registryEntry = DOCUMENT_REGISTRY[parentObjType];
  if (!registryEntry) {
    return;
  }

  for (const entryId of parentDocEntries) {
    const parentLines = await db
      .select()
      .from(registryEntry.lineTable)
      .where(eq(registryEntry.lineTable.docEntry, entryId));

    let allClosed = true;
    for (const parentLine of parentLines) {
      const openQty = await calculateOpenQty(
        db,
        parentObjType,
        entryId,
        parentLine.lineNum,
        Number(parentLine.quantity || 0),
      );
      if (openQty > 0) {
        allClosed = false;
        break;
      }
    }

    const [header] = await db
      .select({ canceled: registryEntry.headerTable.canceled })
      .from(registryEntry.headerTable)
      .where(eq(registryEntry.headerTable.id, entryId))
      .limit(1);

    if (header && header.canceled !== "Y") {
      await db
        .update(registryEntry.headerTable)
        .set({ docStatus: allClosed ? "C" : "O" })
        .where(eq(registryEntry.headerTable.id, entryId));
    }
  }
}
