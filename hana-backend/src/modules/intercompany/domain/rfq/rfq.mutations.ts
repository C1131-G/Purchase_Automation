import { IC_RFQ_STATUS } from "@/modules/intercompany/infrastructure/constants";
import {
  getIcSqlClient,
  toNumber,
  type IcSqlClient,
} from "@/modules/intercompany/infrastructure/ic-sql";

import {
  mapRfqHeaderRow,
  mapRfqLineRow,
  RFQ_HEADER_SELECT_WITH_COMPANY_NAMES,
} from "./rfq.queries";
import type { CreateRfqFromDraftInput, IcRfqHeader, UpdateRfqLineInput } from "./rfq.types";

export type RfqMutations = {
  insertFromDraft: (input: CreateRfqFromDraftInput) => Promise<IcRfqHeader>;
  updateLines: (rfqId: number, lines: UpdateRfqLineInput[]) => Promise<IcRfqHeader | null>;
  setStatus: (rfqId: number, status: string) => Promise<IcRfqHeader | null>;
};

const loadHeaderWithLines = async (
  sql: IcSqlClient,
  rfqId: number,
): Promise<IcRfqHeader | null> => {
  const [rows, lineRows] = await Promise.all([
    sql.query(
      `${RFQ_HEADER_SELECT_WITH_COMPANY_NAMES}
      WHERE h."RFQ_ID" = ?`,
      [rfqId],
    ),
    sql.query(`SELECT * FROM "IC_RFQ_LINE" WHERE "RFQ_ID" = ? ORDER BY "LINE_NUM"`, [rfqId]),
  ]);
  if (!rows[0]) {
    return null;
  }
  const header = mapRfqHeaderRow(rows[0]);
  header.lines = lineRows.map(mapRfqLineRow);
  return header;
};

export const createRfqMutations = (sql: IcSqlClient = getIcSqlClient()): RfqMutations => ({
  insertFromDraft: async (input) => {
    await sql.query(
      `INSERT INTO "IC_RFQ_HEADER"
        ("RFQ_NUMBER","SOURCE_COMPANY_ID","TARGET_COMPANY_ID","PQ_DRAFT_DOC_ENTRY",
         "PQ_DRAFT_DOC_NUM","VENDOR_CODE","STATUS","REMARKS","CREATED_BY")
       VALUES (?,?,?,?,?,?,'DRAFT',?,?)`,
      [
        input.rfqNumber,
        input.sourceCompanyId,
        input.targetCompanyId,
        input.pqDraftDocEntry,
        input.pqDraftDocNum ?? null,
        input.vendorCode,
        input.remarks ?? null,
        input.createdBy ?? null,
      ],
    );
    const idRows = await sql.query(`SELECT CURRENT_IDENTITY_VALUE() AS "ID" FROM DUMMY`);
    const rfqId = toNumber(idRows[0]?.ID ?? idRows[0]?.id);

    for (const line of input.lines) {
      await sql.query(
        `INSERT INTO "IC_RFQ_LINE"
          ("RFQ_ID","LINE_NUM","ITEM_CODE","DESCRIPTION","QUANTITY","UNIT_PRICE",
           "DISCOUNT","TAX_CODE","DELIVERY_DATE","WAREHOUSE","UOM_CODE","REMARKS")
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          rfqId,
          line.lineNum,
          line.itemCode,
          line.description ?? null,
          line.quantity,
          line.unitPrice ?? null,
          line.discount ?? 0,
          line.taxCode ?? null,
          line.deliveryDate ?? null,
          line.warehouse ?? null,
          line.uomCode ?? null,
          line.remarks ?? null,
        ],
      );
    }

    const created = await loadHeaderWithLines(sql, rfqId);
    if (!created) {
      throw new Error(`IC_RFQ_HEADER insert failed id=${rfqId}`);
    }
    return created;
  },

  setStatus: async (rfqId, status) => {
    const extra =
      status === IC_RFQ_STATUS.SUBMITTED
        ? `, "SUBMITTED_AT" = CURRENT_TIMESTAMP`
        : status === IC_RFQ_STATUS.COMPLETED
          ? `, "COMPLETED_AT" = CURRENT_TIMESTAMP`
          : "";
    await sql.query(
      `UPDATE "IC_RFQ_HEADER"
          SET "STATUS" = ?, "UPDATED_AT" = CURRENT_TIMESTAMP${extra}
        WHERE "RFQ_ID" = ?`,
      [status, rfqId],
    );
    return loadHeaderWithLines(sql, rfqId);
  },

  updateLines: async (rfqId, lines) => {
    for (const line of lines) {
      await sql.query(
        `UPDATE "IC_RFQ_LINE"
            SET "UNIT_PRICE" = ?,
                "DELIVERY_DATE" = COALESCE(?, "DELIVERY_DATE"),
                "DISCOUNT" = COALESCE(?, "DISCOUNT"),
                "QUANTITY" = COALESCE(?, "QUANTITY"),
                "UPDATED_AT" = CURRENT_TIMESTAMP
          WHERE "RFQ_ID" = ? AND "LINE_NUM" = ?`,
        [
          line.unitPrice,
          line.deliveryDate ?? null,
          line.discount ?? null,
          line.quantity ?? null,
          rfqId,
          line.lineNum,
        ],
      );
    }
    return loadHeaderWithLines(sql, rfqId);
  },
});

export const rfqMutations = createRfqMutations();
