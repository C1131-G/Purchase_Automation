/**
 * OSCN (BP catalog) helpers — TypeORM only, no full OITM scan.
 * Popup / hydrate show OSCN ∩ OITM for a CardCode; IC maps ItemCode → Substitute.
 */
import { In } from "typeorm";

import { getTenantRepository } from "@/db/tenant-query";
import { ItemSchema } from "@/db/schemas/item.schema";
import { OscnSchema, type OscnCatalog } from "@/db/schemas/oscn.schema";

import { toTrimmed } from "./master-data.lookup-cache";

export type OscnCatalogRow = {
  ItemCode: string;
  CardCode: string;
  Substitute: string;
  Descriptio: string;
};

const toOscnRow = (row: OscnCatalog): OscnCatalogRow | null => {
  const itemCode = toTrimmed(row.ItemCode);
  const cardCode = toTrimmed(row.CardCode);
  if (!itemCode || !cardCode) {
    return null;
  }
  return {
    ItemCode: itemCode,
    CardCode: cardCode,
    Substitute: toTrimmed(row.Substitute),
    Descriptio: toTrimmed(row.Descriptio),
  };
};

/** All OSCN rows for a BP (optional ItemCode filter). */
export async function loadOscnForCardCode(
  dbName: string,
  cardCodeRaw: string,
  itemCodes?: string[],
): Promise<OscnCatalogRow[]> {
  const cardCode = toTrimmed(cardCodeRaw);
  if (!cardCode) {
    return [];
  }

  const repository = await getTenantRepository(dbName, OscnSchema);
  const where: Record<string, unknown> = { CardCode: cardCode };
  if (itemCodes && itemCodes.length > 0) {
    const codes = [...new Set(itemCodes.map((code) => toTrimmed(code)).filter(Boolean))];
    if (codes.length === 0) {
      return [];
    }
    where.ItemCode = In(codes);
  }

  const rows = await repository.find({
    select: ["ItemCode", "CardCode", "Substitute", "Descriptio"] as const,
    where: where as never,
  });

  const mapped: OscnCatalogRow[] = [];
  for (const row of rows) {
    const next = toOscnRow(row);
    if (next) {
      mapped.push(next);
    }
  }
  return mapped;
}

/**
 * OSCN rows for CardCode that also exist on OITM (active), optionally type-filtered.
 * Two-step TypeORM (no join alias issues on HANA).
 */
export async function loadOscnMatchedItemCodes(
  dbName: string,
  cardCodeRaw: string,
  type: "sales" | "purchase" | undefined,
  options?: {
    search?: string;
    limit?: number;
    itemCodes?: string[];
  },
): Promise<{ oscnByItemCode: Map<string, OscnCatalogRow>; itemCodes: string[] }> {
  const cardCode = toTrimmed(cardCodeRaw);
  if (!cardCode) {
    return { oscnByItemCode: new Map(), itemCodes: [] };
  }

  const oscnRows = await loadOscnForCardCode(dbName, cardCode, options?.itemCodes);
  if (oscnRows.length === 0) {
    return { oscnByItemCode: new Map(), itemCodes: [] };
  }

  const candidateCodes = [...new Set(oscnRows.map((row) => row.ItemCode))];
  if (candidateCodes.length === 0) {
    return { oscnByItemCode: new Map(), itemCodes: [] };
  }

  const itemRepository = await getTenantRepository(dbName, ItemSchema);
  // Select ItemName so search can match tenant item master (not only OSCN.Descriptio).
  const query = itemRepository
    .createQueryBuilder("item")
    .select(["item.ItemCode", "item.ItemName"])
    .where("item.ItemCode IN (:...itemCodes)", { itemCodes: candidateCodes })
    .andWhere("item.frozenFor = :active", { active: "N" });

  if (type === "sales") {
    query.andWhere("item.SellItem = :sellItem", { sellItem: "Y" });
  } else if (type === "purchase") {
    query.andWhere("item.PrchseItem = :prchseItem", { prchseItem: "Y" });
  }

  query.orderBy("item.ItemCode", "ASC");

  let items = await query.getMany();
  const oscnByCode = new Map(oscnRows.map((row) => [row.ItemCode, row]));

  const search = toTrimmed(options?.search).toLowerCase();
  if (search) {
    const words = search.split(/\s+/).filter(Boolean);
    items = items.filter((item) => {
      const code = toTrimmed(item.ItemCode);
      const oscn = oscnByCode.get(code);
      const hay =
        `${code} ${toTrimmed(item.ItemName)} ${oscn?.Substitute ?? ""} ${oscn?.Descriptio ?? ""}`.toLowerCase();
      return words.every((word) => hay.includes(word));
    });
  }

  const limit = options?.limit;
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    items = items.slice(0, Math.floor(limit));
  }

  const matchedCodes = items.map((item) => toTrimmed(item.ItemCode)).filter(Boolean);
  const matchedSet = new Set(matchedCodes);

  const oscnByItemCode = new Map<string, OscnCatalogRow>();
  for (const row of oscnRows) {
    if (matchedSet.has(row.ItemCode)) {
      oscnByItemCode.set(row.ItemCode, row);
    }
  }

  return { oscnByItemCode, itemCodes: matchedCodes };
}

/** Ensure each Substitute exists as active ItemCode on target tenant OITM. */
export async function filterExistingTargetItemCodes(
  targetDbName: string,
  partnerItemCodes: string[],
): Promise<Set<string>> {
  const names = await loadItemNamesByCodes(targetDbName, partnerItemCodes);
  return new Set(names.keys());
}

/** Active OITM.ItemCode → ItemName on a tenant (for display / IC partner lines). */
export async function loadItemNamesByCodes(
  dbName: string,
  itemCodes: string[],
): Promise<Map<string, string>> {
  const codes = [...new Set(itemCodes.map((code) => toTrimmed(code)).filter(Boolean))];
  if (codes.length === 0) {
    return new Map();
  }
  const itemRepository = await getTenantRepository(dbName, ItemSchema);
  const items = await itemRepository
    .createQueryBuilder("item")
    .select(["item.ItemCode", "item.ItemName"])
    .where("item.ItemCode IN (:...itemCodes)", { itemCodes: codes })
    .andWhere("item.frozenFor = :active", { active: "N" })
    .getMany();
  const map = new Map<string, string>();
  for (const item of items) {
    const code = toTrimmed(item.ItemCode);
    if (code) {
      map.set(code, toTrimmed(item.ItemName));
    }
  }
  return map;
}
