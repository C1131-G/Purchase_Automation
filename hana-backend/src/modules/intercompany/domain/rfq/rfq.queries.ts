import {
  getIcSqlClient,
  toNullableNumber,
  toNumber,
  toString,
  type IcSqlClient,
} from "@/modules/intercompany/infrastructure/ic-sql";

import type { IcRfqHeader, IcRfqLine } from "./rfq.types";

const pickNullableString = (row: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined) {
      continue;
    }
    const text = toString(value).trim();
    if (text) {
      return text;
    }
  }
  return null;
};

export const mapRfqLineRow = (row: Record<string, unknown>): IcRfqLine => {
  // Buyer PQ / RFQ purchase tax (IC_RFQ_LINE.TAX_CODE). Accept common key casings.
  const taxCode = pickNullableString(row, [
    "TAX_CODE",
    "taxCode",
    "TaxCode",
    "tax_code",
    "VatGroup",
    "vatGroup",
  ]);
  // Seller SQ sales tax when column exists (optional).
  const sqTaxCode = pickNullableString(row, [
    "SQ_TAX_CODE",
    "sqTaxCode",
    "SqTaxCode",
    "sq_tax_code",
  ]);

  return {
    deliveryDate:
      row.DELIVERY_DATE === null || row.DELIVERY_DATE === undefined
        ? null
        : toString(row.DELIVERY_DATE),
    description:
      row.DESCRIPTION === null || row.DESCRIPTION === undefined ? null : toString(row.DESCRIPTION),
    discount: toNullableNumber(row.DISCOUNT ?? row.discount),
    itemCode: toString(row.ITEM_CODE ?? row.itemCode),
    lineNum: toNumber(row.LINE_NUM ?? row.lineNum),
    quantity: toNumber(row.QUANTITY ?? row.quantity),
    remarks: row.REMARKS === null || row.REMARKS === undefined ? null : toString(row.REMARKS),
    rfqId: toNumber(row.RFQ_ID ?? row.rfqId),
    rfqLineId: toNumber(row.RFQ_LINE_ID ?? row.rfqLineId),
    taxCode,
    // Explicit aliases so product-row UI never has to guess field names.
    pqTaxCode: taxCode,
    sqTaxCode,
    unitPrice: toNullableNumber(row.UNIT_PRICE ?? row.unitPrice),
    uomCode: row.UOM_CODE === null || row.UOM_CODE === undefined ? null : toString(row.UOM_CODE),
    warehouse:
      row.WAREHOUSE === null || row.WAREHOUSE === undefined ? null : toString(row.WAREHOUSE),
  };
};

const toNullableName = (value: unknown): string | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return toString(value);
};

/**
 * RFQ header + IC_COMPANY names (source = buyer, target = seller).
 * Shared by queries and mutation reloads so list/detail always show names.
 */
export const RFQ_HEADER_SELECT_WITH_COMPANY_NAMES = `
SELECT h.*,
       sc."COMPANY_NAME" AS "SOURCE_COMPANY_NAME",
       tc."COMPANY_NAME" AS "TARGET_COMPANY_NAME"
  FROM "IC_RFQ_HEADER" h
  LEFT JOIN "IC_COMPANY" sc ON sc."COMPANY_ID" = h."SOURCE_COMPANY_ID"
  LEFT JOIN "IC_COMPANY" tc ON tc."COMPANY_ID" = h."TARGET_COMPANY_ID"`;

export const mapRfqHeaderRow = (row: Record<string, unknown>): IcRfqHeader => ({
  createdBy:
    row.CREATED_BY === null || row.CREATED_BY === undefined ? null : toString(row.CREATED_BY),
  pqDraftDocEntry: toNumber(row.PQ_DRAFT_DOC_ENTRY ?? row.pqDraftDocEntry),
  pqDraftDocNum: toNullableNumber(row.PQ_DRAFT_DOC_NUM ?? row.pqDraftDocNum),
  remarks: row.REMARKS === null || row.REMARKS === undefined ? null : toString(row.REMARKS),
  rfqId: toNumber(row.RFQ_ID ?? row.rfqId),
  rfqNumber: toString(row.RFQ_NUMBER ?? row.rfqNumber),
  sourceCompanyId: toNumber(row.SOURCE_COMPANY_ID ?? row.sourceCompanyId),
  sourceCompanyName: toNullableName(row.SOURCE_COMPANY_NAME ?? row.sourceCompanyName),
  status: toString(row.STATUS ?? row.status),
  targetCompanyId: toNumber(row.TARGET_COMPANY_ID ?? row.targetCompanyId),
  targetCompanyName: toNullableName(row.TARGET_COMPANY_NAME ?? row.targetCompanyName),
  vendorCode: toString(row.VENDOR_CODE ?? row.vendorCode),
});

export type RfqQueries = {
  getById: (rfqId: number, withLines?: boolean) => Promise<IcRfqHeader | null>;
  findBySourceDraft: (
    sourceCompanyId: number,
    pqDraftDocEntry: number,
  ) => Promise<IcRfqHeader | null>;
  listForCompany: (companyId: number) => Promise<IcRfqHeader[]>;
};

export const createRfqQueries = (sql: IcSqlClient = getIcSqlClient()): RfqQueries => ({
  findBySourceDraft: async (sourceCompanyId, pqDraftDocEntry) => {
    const rows = await sql.query(
      `${RFQ_HEADER_SELECT_WITH_COMPANY_NAMES}
        WHERE h."SOURCE_COMPANY_ID" = ? AND h."PQ_DRAFT_DOC_ENTRY" = ?`,
      [sourceCompanyId, pqDraftDocEntry],
    );
    return rows[0] ? mapRfqHeaderRow(rows[0]) : null;
  },

  getById: async (rfqId, withLines = true) => {
    const rows = await sql.query(
      `${RFQ_HEADER_SELECT_WITH_COMPANY_NAMES}
        WHERE h."RFQ_ID" = ?`,
      [rfqId],
    );
    if (!rows[0]) {
      return null;
    }
    const header = mapRfqHeaderRow(rows[0]);
    if (withLines) {
      const lineRows = await sql.query(
        `SELECT * FROM "IC_RFQ_LINE" WHERE "RFQ_ID" = ? ORDER BY "LINE_NUM"`,
        [rfqId],
      );
      header.lines = lineRows.map(mapRfqLineRow);
    }
    return header;
  },

  /** Seller inbox only — RFQs where this company is the target (not buyer/source). */
  listForCompany: async (companyId) => {
    const rows = await sql.query(
      `${RFQ_HEADER_SELECT_WITH_COMPANY_NAMES}
        WHERE h."TARGET_COMPANY_ID" = ?
        ORDER BY h."RFQ_ID" DESC`,
      [companyId],
    );
    return rows.map(mapRfqHeaderRow);
  },
});

export const rfqQueries = createRfqQueries();
