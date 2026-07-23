import type { IcRfqLine } from "@/modules/intercompany/domain/rfq/rfq.types";
import type {
  IcSlDocumentResult,
  IcSlDocuments,
} from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";

export const buildSalesQuotationLines = async (
  lines: IcRfqLine[],
  mapTaxCode: (sourceTaxCode: string) => Promise<string>,
): Promise<Record<string, unknown>[]> => {
  const result: Record<string, unknown>[] = [];
  for (const line of lines) {
    const sourceTax = line.taxCode?.trim() ?? "";
    const targetTax = sourceTax ? await mapTaxCode(sourceTax) : "";

    const docLine: Record<string, unknown> = {
      DiscountPercent: line.discount ?? 0,
      ItemCode: line.itemCode,
      Quantity: line.quantity,
      UnitPrice: line.unitPrice ?? 0,
    };
    if (targetTax) {
      docLine.VatGroup = targetTax;
    }
    if (line.warehouse) {
      docLine.WarehouseCode = line.warehouse;
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
  return params.documents.createSalesQuotation({
    cardCode: params.buyerCustomerCode,
    companyId: params.sellerCompanyId,
    lines: documentLines,
    remarks: params.remarks,
  });
};
