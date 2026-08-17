/**
 * Attach seller sales tax (sqTaxCode) on RFQ open so the seller UI
 * does not show the buyer PQ purchase VatGroup.
 *
 * Same resolver as convert PQ→SQ: OVTG rate + Category O, then item/BP.
 * Does not persist — IC_RFQ_LINE.TAX_CODE stays the buyer snapshot.
 */

import { createPartnerTaxResolver } from "@/modules/intercompany/config/tax-mapping/resolve-partner-tax.service";
import { logger } from "@/core/logger/pino-logger";

import type { IcRfqHeader, IcRfqLine } from "./rfq.types";

export type ResolveRfqSalesTax = (input: {
  itemCode: string;
  sourceTaxCode: string;
  targetCardCode: string | null;
  sourceCompanyId: number;
  targetCompanyId: number;
}) => Promise<string>;

const createDefaultResolveRfqSalesTax = (): ResolveRfqSalesTax => {
  const resolver = createPartnerTaxResolver();
  return async (input) =>
    resolver.resolveLineTax({
      docSide: "sales",
      itemCode: input.itemCode,
      sourceCompanyId: input.sourceCompanyId,
      sourceTaxCode: input.sourceTaxCode,
      targetCardCode: input.targetCardCode,
      targetCompanyId: input.targetCompanyId,
    });
};

const sourcePurchaseTax = (line: IcRfqLine): string =>
  String(line.pqTaxCode ?? line.taxCode ?? "").trim();

export const attachRfqSellerSalesTax = async (
  header: IcRfqHeader,
  resolveLineTax: ResolveRfqSalesTax = createDefaultResolveRfqSalesTax(),
): Promise<IcRfqHeader> => {
  const lines = header.lines ?? [];
  if (lines.length === 0) {
    return header;
  }

  try {
    const nextLines = await Promise.all(
      lines.map(async (line) => {
        const knownSales = String(line.sqTaxCode ?? "").trim();
        if (knownSales) {
          return {
            ...line,
            pqTaxCode: line.pqTaxCode ?? line.taxCode ?? null,
            sqTaxCode: knownSales,
          };
        }

        const salesTax = (
          await resolveLineTax({
            itemCode: line.itemCode,
            sourceCompanyId: header.sourceCompanyId,
            sourceTaxCode: sourcePurchaseTax(line),
            targetCardCode: header.customerCode ?? null,
            targetCompanyId: header.targetCompanyId,
          })
        ).trim();

        return {
          ...line,
          pqTaxCode: line.pqTaxCode ?? line.taxCode ?? null,
          sqTaxCode: salesTax || null,
        };
      }),
    );

    return { ...header, lines: nextLines };
  } catch (err: unknown) {
    logger.warn({
      err: err instanceof Error ? err : new Error(String(err)),
      msg: "RFQ seller sales tax resolve failed; leaving line tax as-is",
      rfqId: header.rfqId,
      targetCompanyId: header.targetCompanyId,
    });
    return header;
  }
};
