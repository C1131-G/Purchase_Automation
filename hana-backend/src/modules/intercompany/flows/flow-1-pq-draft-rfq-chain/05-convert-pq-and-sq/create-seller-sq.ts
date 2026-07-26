import type { IcRfqLine } from "@/modules/intercompany/domain/rfq/rfq.types";
import { IC_LOG_SCOPE, icLog } from "@/modules/intercompany/infrastructure/ic-logger";
import type {
  IcSlDocumentResult,
  IcSlDocuments,
} from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";

/**
 * Build SQ lines for the seller company.
 * - VatGroup only when IC_TAX_MAPPING yields a **seller** tax code (never buyer tax).
 * - Warehouse omitted: buyer WH codes are often invalid on seller; SAP uses BP/item default.
 */
export const buildSalesQuotationLines = async (
  lines: IcRfqLine[],
  mapTaxCode: (sourceTaxCode: string) => Promise<string>,
): Promise<Record<string, unknown>[]> => {
  const result: Record<string, unknown>[] = [];
  for (const line of lines) {
    const sourceTax = line.taxCode?.trim() ?? "";
    const targetTax = sourceTax ? (await mapTaxCode(sourceTax)).trim() : "";

    const docLine: Record<string, unknown> = {
      DiscountPercent: line.discount ?? 0,
      ItemCode: line.itemCode,
      Quantity: line.quantity,
      UnitPrice: line.unitPrice ?? 0,
    };
    // Only set when mapped to a real seller VAT group. Empty / unmapped → omit
    // so SAP uses customer default tax (avoids "Invalid VAT Group" from buyer codes).
    if (targetTax) {
      docLine.VatGroup = targetTax;
    }
    if (line.uomCode) {
      docLine.UoMCode = line.uomCode;
      docLine.UseBaseUnit = "tNO";
    }
    if (line.deliveryDate) {
      docLine.ShipDate = line.deliveryDate;
    }
    result.push(docLine);
  }
  return result;
};

export const createSellerSq = async (params: {
  documents: IcSlDocuments;
  sellerCompanyId: number;
  buyerCustomerCode: string;
  lines: IcRfqLine[];
  remarks: string;
  mapTaxCode: (sourceTaxCode: string) => Promise<string>;
}): Promise<IcSlDocumentResult> => {
  const documentLines = await buildSalesQuotationLines(params.lines, params.mapTaxCode);

  icLog.info(IC_LOG_SCOPE.FLOW1, "Flow 1 SQ lines prepared for seller", {
    check: "sq_lines_vat",
    lineCount: documentLines.length,
    lines: documentLines.map((line, index) => ({
      itemCode: line.ItemCode ?? null,
      lineNum: index,
      quantity: line.Quantity ?? null,
      unitPrice: line.UnitPrice ?? null,
      vatGroup: line.VatGroup ?? null,
    })),
    outcome: "pass",
    sellerCompanyId: params.sellerCompanyId,
  });

  return params.documents.createSalesQuotation({
    cardCode: params.buyerCustomerCode,
    companyId: params.sellerCompanyId,
    lines: documentLines,
    remarks: params.remarks,
  });
};
