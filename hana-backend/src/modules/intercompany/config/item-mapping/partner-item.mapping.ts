/**
 * Map buyer (source) ItemCodes → partner ItemCodes via OSCN.Substitute.
 *
 * Source DB OSCN: CardCode = partner BP on buyer books, ItemCode = buyer item.
 * Substitute = partner company ItemCode; must exist on target OITM.
 * Missing OSCN row, empty Substitute, or missing target OITM → hard fail (IC retry).
 */
import {
  filterExistingTargetItemCodes,
  loadOscnForCardCode,
} from "@/modules/master-data/master-data.oscn";
import { toTrimmed } from "@/modules/master-data/master-data.lookup-cache";

export class IcItemCodeMappingError extends Error {
  readonly code = "IC_ITEM_CODE_MAPPING" as const;
  readonly missingSourceCodes: string[];
  readonly missingSubstituteCodes: string[];
  readonly emptySubstituteCodes: string[];

  constructor(input: {
    message: string;
    missingSourceCodes?: string[];
    missingSubstituteCodes?: string[];
    emptySubstituteCodes?: string[];
  }) {
    super(input.message);
    this.name = "IcItemCodeMappingError";
    this.missingSourceCodes = input.missingSourceCodes ?? [];
    this.missingSubstituteCodes = input.missingSubstituteCodes ?? [];
    this.emptySubstituteCodes = input.emptySubstituteCodes ?? [];
  }
}

export type PartnerItemMapEntry = {
  sourceItemCode: string;
  partnerItemCode: string;
  description: string;
};

export type MapSourceItemsToPartnerInput = {
  /** Buyer / source SAP DB (where OSCN is read). */
  sourceDbName: string;
  /** Partner BP CardCode on source company (vendor on PQ/PO, customer on reverse sales). */
  partnerCardCode: string;
  /** Buyer document ItemCodes. */
  itemCodes: string[];
  /** Seller / target SAP DB — Substitute must exist as OITM.ItemCode. */
  targetDbName: string;
};

/**
 * Resolve each source ItemCode to partner ItemCode (OSCN.Substitute on source + OITM on target).
 */
export async function mapSourceItemsToPartnerItems(
  input: MapSourceItemsToPartnerInput,
): Promise<Map<string, PartnerItemMapEntry>> {
  const sourceDbName = toTrimmed(input.sourceDbName);
  const targetDbName = toTrimmed(input.targetDbName);
  const partnerCardCode = toTrimmed(input.partnerCardCode);
  const requested = [...new Set(input.itemCodes.map((code) => toTrimmed(code)).filter(Boolean))];

  if (!sourceDbName || !targetDbName || !partnerCardCode) {
    throw new IcItemCodeMappingError({
      message:
        "IC item mapping requires sourceDbName, targetDbName, and partnerCardCode (OSCN CardCode).",
    });
  }

  if (requested.length === 0) {
    return new Map();
  }

  const oscnRows = await loadOscnForCardCode(sourceDbName, partnerCardCode, requested);
  const bySource = new Map(oscnRows.map((row) => [row.ItemCode, row]));

  const missingSourceCodes: string[] = [];
  const emptySubstituteCodes: string[] = [];
  const pending: Array<{ sourceItemCode: string; partnerItemCode: string; description: string }> =
    [];

  for (const sourceItemCode of requested) {
    const row = bySource.get(sourceItemCode);
    if (!row) {
      missingSourceCodes.push(sourceItemCode);
      continue;
    }
    const partnerItemCode = toTrimmed(row.Substitute);
    if (!partnerItemCode) {
      emptySubstituteCodes.push(sourceItemCode);
      continue;
    }
    pending.push({
      sourceItemCode,
      partnerItemCode,
      description: row.Descriptio,
    });
  }

  if (missingSourceCodes.length > 0 || emptySubstituteCodes.length > 0) {
    throw new IcItemCodeMappingError({
      message: `IC OSCN mapping failed for CardCode=${partnerCardCode} on ${sourceDbName}: missing=[${missingSourceCodes.join(",")}] emptySubstitute=[${emptySubstituteCodes.join(",")}]`,
      missingSourceCodes,
      emptySubstituteCodes,
    });
  }

  const partnerCodes = pending.map((row) => row.partnerItemCode);
  const existingOnTarget = await filterExistingTargetItemCodes(targetDbName, partnerCodes);
  const missingSubstituteCodes = partnerCodes.filter((code) => !existingOnTarget.has(code));

  if (missingSubstituteCodes.length > 0) {
    throw new IcItemCodeMappingError({
      message: `IC partner OITM missing for Substitute codes on ${targetDbName}: [${[...new Set(missingSubstituteCodes)].join(",")}]`,
      missingSubstituteCodes: [...new Set(missingSubstituteCodes)],
    });
  }

  const result = new Map<string, PartnerItemMapEntry>();
  for (const row of pending) {
    result.set(row.sourceItemCode, row);
  }
  return result;
}

/** Remap document lines' ItemCode field using a resolved partner map. */
export function applyPartnerItemMapToLines<T extends { ItemCode?: unknown; itemCode?: unknown }>(
  lines: T[] | undefined,
  partnerMap: Map<string, PartnerItemMapEntry>,
): T[] {
  if (!Array.isArray(lines) || lines.length === 0) {
    return [];
  }
  return lines.map((line) => {
    const sourceCode = toTrimmed(line.ItemCode ?? line.itemCode);
    const mapped = partnerMap.get(sourceCode);
    if (!mapped) {
      throw new IcItemCodeMappingError({
        message: `IC line ItemCode not in partner map: ${sourceCode || "(empty)"}`,
        missingSourceCodes: sourceCode ? [sourceCode] : [],
      });
    }
    return {
      ...line,
      ItemCode: mapped.partnerItemCode,
      itemCode: mapped.partnerItemCode,
    };
  });
}
