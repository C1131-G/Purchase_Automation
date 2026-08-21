/**
 * Attach seller item-master sales UoM on RFQ open so the seller UI
 * does not show the buyer PQ purchase UoM.
 *
 * Same source as convert PQ→SQ: OITM.SalUnitMsr / SUoMEntry, OUOM matched
 * by entry then by UomCode or UomName (case-insensitive).
 * Does not persist — IC_RFQ_LINE.UOM_CODE stays the buyer snapshot.
 */

import { createCompanyQueries } from "@/modules/intercompany/config/company/company.queries";
import { logger } from "@/core/logger/pino-logger";
import {
  resolveItemSalesUom,
  type ResolvedTenantUom,
} from "@/modules/master-data/master-data.warehouses-series.queries";

import type { IcRfqHeader, IcRfqLine } from "./rfq.types";

export type ResolveRfqSalesUom = (input: {
  itemCode: string;
  sourceUomCode: string;
  targetCompanyId: number;
}) => Promise<ResolvedTenantUom | null>;

const isTestRuntime = (): boolean =>
  process.env.VITEST === "true" || process.env.NODE_ENV === "test";

const createDefaultResolveRfqSalesUom = (): ResolveRfqSalesUom => {
  const companies = createCompanyQueries();
  return async (input) => {
    if (isTestRuntime()) {
      return null;
    }
    const itemCode = input.itemCode.trim();
    if (!itemCode) {
      return null;
    }
    const seller = await companies.getById(input.targetCompanyId);
    const sapDbName = seller?.sapDbName?.trim() || "";
    if (!sapDbName) {
      return null;
    }
    return resolveItemSalesUom(sapDbName, itemCode);
  };
};

const sourcePurchaseUom = (line: IcRfqLine): string => String(line.uomCode ?? "").trim();

export const attachRfqSellerSalesUom = async (
  header: IcRfqHeader,
  resolveSalesUom: ResolveRfqSalesUom = createDefaultResolveRfqSalesUom(),
): Promise<IcRfqHeader> => {
  const lines = header.lines ?? [];
  if (lines.length === 0) {
    return header;
  }

  try {
    const nextLines = await Promise.all(
      lines.map(async (line) => {
        const knownSales = String(line.sqUomCode ?? "").trim();
        if (knownSales && !/^manual$/i.test(knownSales)) {
          return {
            ...line,
            sqUomCode: knownSales,
            sqUomEntry: line.sqUomEntry != null && line.sqUomEntry > 0 ? line.sqUomEntry : null,
          };
        }

        const sales = await resolveSalesUom({
          itemCode: String(line.itemCode ?? "").trim(),
          sourceUomCode: sourcePurchaseUom(line),
          targetCompanyId: header.targetCompanyId,
        });
        const salesCode = sales?.uomCode?.trim() || "";
        if (!salesCode || /^manual$/i.test(salesCode)) {
          return line;
        }

        return {
          ...line,
          sqUomCode: salesCode,
          sqUomEntry: sales?.uomEntry != null && sales.uomEntry > 0 ? sales.uomEntry : null,
        };
      }),
    );

    return { ...header, lines: nextLines };
  } catch (err: unknown) {
    logger.warn({
      err: err instanceof Error ? err : new Error(String(err)),
      msg: "RFQ seller sales UoM resolve failed; leaving line UoM as-is",
      rfqId: header.rfqId,
      targetCompanyId: header.targetCompanyId,
    });
    return header;
  }
};
