import {
  getIcSqlClient,
  toNullableNumber,
  toNumber,
  toString,
  type IcSqlClient,
} from "@/modules/intercompany/infrastructure/ic-sql";

import type { IcRfqHeader, IcRfqLine } from "./rfq.types";

export const mapRfqLineRow = (row: Record<string, unknown>): IcRfqLine => ({
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
  taxCode: row.TAX_CODE === null || row.TAX_CODE === undefined ? null : toString(row.TAX_CODE),
  unitPrice: toNullableNumber(row.UNIT_PRICE ?? row.unitPrice),
  uomCode: row.UOM_CODE === null || row.UOM_CODE === undefined ? null : toString(row.UOM_CODE),
  warehouse: row.WAREHOUSE === null || row.WAREHOUSE === undefined ? null : toString(row.WAREHOUSE),
});

export const mapRfqHeaderRow = (row: Record<string, unknown>): IcRfqHeader => ({
  createdBy:
    row.CREATED_BY === null || row.CREATED_BY === undefined ? null : toString(row.CREATED_BY),
  pqDraftDocEntry: toNumber(row.PQ_DRAFT_DOC_ENTRY ?? row.pqDraftDocEntry),
  pqDraftDocNum: toNullableNumber(row.PQ_DRAFT_DOC_NUM ?? row.pqDraftDocNum),
  remarks: row.REMARKS === null || row.REMARKS === undefined ? null : toString(row.REMARKS),
  rfqId: toNumber(row.RFQ_ID ?? row.rfqId),
  rfqNumber: toString(row.RFQ_NUMBER ?? row.rfqNumber),
  sourceCompanyId: toNumber(row.SOURCE_COMPANY_ID ?? row.sourceCompanyId),
  status: toString(row.STATUS ?? row.status),
  targetCompanyId: toNumber(row.TARGET_COMPANY_ID ?? row.targetCompanyId),
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
      `SELECT * FROM "IC_RFQ_HEADER"
        WHERE "SOURCE_COMPANY_ID" = ? AND "PQ_DRAFT_DOC_ENTRY" = ?`,
      [sourceCompanyId, pqDraftDocEntry],
    );
    return rows[0] ? mapRfqHeaderRow(rows[0]) : null;
  },

  getById: async (rfqId, withLines = true) => {
    const rows = await sql.query(`SELECT * FROM "IC_RFQ_HEADER" WHERE "RFQ_ID" = ?`, [rfqId]);
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
      `SELECT * FROM "IC_RFQ_HEADER"
        WHERE "TARGET_COMPANY_ID" = ?
        ORDER BY "RFQ_ID" DESC`,
      [companyId],
    );
    return rows.map(mapRfqHeaderRow);
  },
});

export const rfqQueries = createRfqQueries();
