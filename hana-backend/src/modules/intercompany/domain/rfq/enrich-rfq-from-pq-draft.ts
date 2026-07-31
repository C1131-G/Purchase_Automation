/**
 * Enrich RFQ API payload from buyer-side source document.
 *
 * Prefer live **PQ** (OPQT/PQT1) at PQ_DRAFT_DOC_ENTRY (column name is historical).
 * Legacy draft (ODRF) is a fallback only. Also uses RFQ→PQ map when present.
 */

import { executeTenantQuery } from "@/db/tenant-query";
import { createCompanyQueries } from "@/modules/intercompany/config/company/company.queries";
import { createDocumentMapQueries } from "@/modules/intercompany/domain/document-map/document-map.queries";
import { logger } from "@/core/logger/pino-logger";
import {
  buildFlow1RfqRemarks,
  mergeUserAndIcRemarks,
} from "@/modules/intercompany/infrastructure/ic-remarks-chain";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";

import { withRfqCustomerDisplay } from "./resolve-rfq-customer-display";
import type { IcRfqHeader, IcRfqLine } from "./rfq.types";

const PQ_DRAFT_OBJ = "540000006";

const toDateOnly = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = String(value).trim();
  if (!raw) {
    return null;
  }
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw.slice(0, 10);
};

const toNum = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const toStr = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const str = String(value).trim();
  return str || null;
};

type SourceHeaderRow = Record<string, unknown>;
type SourceLineRow = Record<string, unknown>;

type SourceDoc = {
  header: SourceHeaderRow;
  lines: SourceLineRow[];
  /** "draft" | "pq" — for logs / pqDraftDocNum handling */
  kind: "draft" | "pq";
  docEntry: number;
  docNum: number | null;
};

const loadDraftHeader = async (
  dbName: string,
  docEntry: number,
): Promise<SourceHeaderRow | null> => {
  const rows = (await executeTenantQuery(
    dbName,
    `SELECT
       "DocEntry", "DocNum", "CardCode", "CardName",
       "DocDate", "DocDueDate",
       "Address", "Address2", "SlpCode", "Comments", "NumAtCard"
     FROM "ODRF"
     WHERE "DocEntry" = ? AND "ObjType" = ?`,
    [docEntry, PQ_DRAFT_OBJ],
  )) as SourceHeaderRow[];
  return rows[0] ?? null;
};

const loadDraftLines = async (dbName: string, docEntry: number): Promise<SourceLineRow[]> => {
  return (await executeTenantQuery(
    dbName,
    `SELECT
       "LineNum", "ItemCode", "Dscription",
       "Quantity", "PQTReqQty", "PQTReqDate", "ShipDate",
       "Price", "PriceBefDi", "DiscPrcnt", "VatGroup", "WhsCode", "UomCode"
     FROM "DRF1"
     WHERE "DocEntry" = ?
     ORDER BY "LineNum"`,
    [docEntry],
  )) as SourceLineRow[];
};

/** Real purchase quotation after draft convert. */
const loadPqHeader = async (dbName: string, docEntry: number): Promise<SourceHeaderRow | null> => {
  const rows = (await executeTenantQuery(
    dbName,
    `SELECT
       "DocEntry", "DocNum", "CardCode", "CardName",
       "DocDate", "DocDueDate",
       "Address", "Address2", "SlpCode", "Comments", "NumAtCard"
     FROM "OPQT"
     WHERE "DocEntry" = ?`,
    [docEntry],
  )) as SourceHeaderRow[];
  return rows[0] ?? null;
};

const loadPqLines = async (dbName: string, docEntry: number): Promise<SourceLineRow[]> => {
  return (await executeTenantQuery(
    dbName,
    `SELECT
       "LineNum", "ItemCode", "Dscription",
       "Quantity", "PQTReqQty", "PQTReqDate", "ShipDate",
       "Price", "PriceBefDi", "DiscPrcnt", "VatGroup", "WhsCode", "UomCode"
     FROM "PQT1"
     WHERE "DocEntry" = ?
     ORDER BY "LineNum"`,
    [docEntry],
  )) as SourceLineRow[];
};

const loadBuyerName = async (dbName: string, slpCode: number | null): Promise<string | null> => {
  if (slpCode === null || !Number.isFinite(slpCode)) {
    return null;
  }
  const rows = (await executeTenantQuery(
    dbName,
    `SELECT "SlpName" FROM "OSLP" WHERE "SlpCode" = ?`,
    [slpCode],
  )) as Array<Record<string, unknown>>;
  return toStr(rows[0]?.SlpName ?? rows[0]?.slpName);
};

const loadVendorName = async (dbName: string, cardCode: string): Promise<string | null> => {
  if (!cardCode) {
    return null;
  }
  const rows = (await executeTenantQuery(
    dbName,
    `SELECT "CardName" FROM "OCRD" WHERE "CardCode" = ?`,
    [cardCode],
  )) as Array<Record<string, unknown>>;
  return toStr(rows[0]?.CardName ?? rows[0]?.cardName);
};

/**
 * Resolve buyer source document for display:
 * 1) Real PQ OPQT at PQ_DRAFT_DOC_ENTRY (direct PQ architecture)
 * 2) RFQ → PQ document map (after convert)
 * 3) Heuristic: OPQT with comments/remarks tag IC-RFQ-{rfqNumber}
 * 4) Legacy PQ draft ODRF (old Flow 1 only)
 */
const resolveSourceDoc = async (dbName: string, header: IcRfqHeader): Promise<SourceDoc | null> => {
  const sourceEntry = header.pqDraftDocEntry;
  if (Number.isFinite(sourceEntry) && sourceEntry > 0) {
    const pqHeader = await loadPqHeader(dbName, sourceEntry);
    if (pqHeader) {
      const lines = await loadPqLines(dbName, sourceEntry);
      return {
        docEntry: sourceEntry,
        docNum: toNum(pqHeader.DocNum ?? pqHeader.docNum),
        header: pqHeader,
        kind: "pq",
        lines,
      };
    }
  }

  // RFQ → PQ map (buyer company, target is real PQ).
  try {
    const map = await createDocumentMapQueries().findBySource({
      sourceCompanyId: header.sourceCompanyId,
      sourceDocEntry: String(header.rfqId),
      sourceObject: IC_OBJECT.RFQ,
      targetObject: IC_OBJECT.PQ,
    });
    if (map?.targetDocEntry) {
      const pqEntry = Number(map.targetDocEntry);
      if (Number.isFinite(pqEntry) && pqEntry > 0) {
        const pqHeader = await loadPqHeader(dbName, pqEntry);
        if (pqHeader) {
          const lines = await loadPqLines(dbName, pqEntry);
          const mappedNum =
            map.targetDocNum != null && map.targetDocNum !== "" ? Number(map.targetDocNum) : null;
          return {
            docEntry: pqEntry,
            docNum:
              mappedNum != null && Number.isFinite(mappedNum)
                ? mappedNum
                : toNum(pqHeader.DocNum ?? pqHeader.docNum),
            header: pqHeader,
            kind: "pq",
            lines,
          };
        }
      }
    }
  } catch (err: unknown) {
    logger.warn({
      err: err instanceof Error ? err : new Error(String(err)),
      msg: "RFQ enrich: document map lookup failed",
      rfqId: header.rfqId,
    });
  }

  // Fallback: remarks tag on posted PQ (IC-RFQ-{rfqNumber}).
  const tag = `IC-RFQ-${header.rfqNumber}`;
  try {
    const rows = (await executeTenantQuery(
      dbName,
      `SELECT
         "DocEntry", "DocNum", "CardCode", "CardName",
         "DocDate", "DocDueDate",
         "Address", "Address2", "SlpCode", "Comments", "NumAtCard"
       FROM "OPQT"
       WHERE "Comments" LIKE ? OR "NumAtCard" LIKE ?
       ORDER BY "DocEntry" DESC
       LIMIT 1`,
      [`%${tag}%`, `%${tag}%`],
    )) as SourceHeaderRow[];
    const pqHeader = rows[0];
    if (pqHeader) {
      const pqEntry = toNum(pqHeader.DocEntry ?? pqHeader.docEntry);
      if (pqEntry != null && pqEntry > 0) {
        const lines = await loadPqLines(dbName, pqEntry);
        return {
          docEntry: pqEntry,
          docNum: toNum(pqHeader.DocNum ?? pqHeader.docNum),
          header: pqHeader,
          kind: "pq",
          lines,
        };
      }
    }
  } catch {
    // Best-effort; OPQT Comments search may be restricted.
  }

  // Legacy: old Flow 1 stored ODRF draft entry.
  if (Number.isFinite(sourceEntry) && sourceEntry > 0) {
    const draftHeader = await loadDraftHeader(dbName, sourceEntry);
    if (draftHeader) {
      const lines = await loadDraftLines(dbName, sourceEntry);
      return {
        docEntry: sourceEntry,
        docNum: toNum(draftHeader.DocNum ?? draftHeader.docNum),
        header: draftHeader,
        kind: "draft",
        lines,
      };
    }
  }

  return null;
};

const mergeLine = (line: IcRfqLine, source: SourceLineRow | undefined): IcRfqLine => {
  if (!source) {
    return {
      ...line,
      // Keep quoted vs required split — do not invent required from quoted (or vice versa).
      requiredDate: line.requiredDate ?? null,
      requiredQuantity: line.requiredQuantity ?? null,
    };
  }

  const description =
    toStr(line.description) ??
    toStr(source.Dscription) ??
    toStr(source.dscription) ??
    toStr(source.ItemDescription);

  const requiredQty =
    toNum(source.PQTReqQty ?? source.pqtReqQty) ??
    toNum(source.RequiredQuantity) ??
    line.requiredQuantity ??
    null;

  const quotedFromSource = toNum(source.Quantity ?? source.quantity);
  // Prefer IC line quoted qty (seller fill); else SAP Ship/Quantity only — never required.
  const quantity =
    line.quantity > 0
      ? line.quantity
      : quotedFromSource && quotedFromSource > 0
        ? quotedFromSource
        : 0;

  const unitPrice =
    line.unitPrice !== null && line.unitPrice !== undefined
      ? line.unitPrice
      : (toNum(source.Price ?? source.PriceBefDi) ?? null);

  const discount =
    line.discount !== null && line.discount !== undefined
      ? line.discount
      : (toNum(source.DiscPrcnt ?? source.discPrcnt) ?? 0);

  const requiredDate =
    toDateOnly(source.PQTReqDate ?? source.pqtReqDate ?? source.ReqDate) ??
    line.requiredDate ??
    null;

  // Quoted date only — never fall back to required date.
  const deliveryDate =
    toDateOnly(line.deliveryDate) ?? toDateOnly(source.ShipDate ?? source.shipDate) ?? null;

  const warehouse =
    toStr(line.warehouse) ?? toStr(source.WhsCode ?? source.whsCode ?? source.WarehouseCode);

  const uomCode = toStr(line.uomCode) ?? toStr(source.UomCode ?? source.uomCode ?? source.UoMCode);

  const taxCode =
    toStr(line.taxCode) ??
    toStr(line.pqTaxCode) ??
    toStr(source?.VatGroup ?? source?.vatGroup ?? source?.VATGROUP ?? source?.TaxCode);

  return {
    ...line,
    deliveryDate,
    description,
    discount,
    quantity,
    requiredDate,
    requiredQuantity: requiredQty,
    taxCode,
    // Always expose explicit alias for product-row UI (PQ Tax column).
    pqTaxCode: taxCode ?? toStr(line.pqTaxCode),
    sqTaxCode: toStr(line.sqTaxCode) ?? null,
    unitPrice,
    uomCode,
    warehouse,
  };
};

/**
 * Ensure RFQ always exposes auto IC remarks for open view.
 * RFQ open = PQ only. CardName only (vendorName when enriched; never CardCode).
 */
const withEnsuredRfqRemarks = (
  header: IcRfqHeader,
  draftComments?: string | null,
): IcRfqHeader => ({
  ...header,
  remarks: buildFlow1RfqRemarks({
    cardName: header.vendorName?.trim() || null,
    existing: mergeUserAndIcRemarks(draftComments, header.remarks),
    pqDraftDocEntry: header.pqDraftDocEntry,
    pqDraftDocNum: header.pqDraftDocNum,
    rfqId: header.rfqId,
    rfqNumber: header.rfqNumber,
  }),
});

/**
 * Merge buyer real PQ into RFQ for seller UI (legacy ODRF fallback only if needed).
 * Failures are logged and original header is returned (never throws).
 *
 * Sales-side fields: customerCode / customerName (buyer on seller books).
 * vendorCode remains the IC routing key (buyer-side vendor); do not show as customer.
 */
export const enrichRfqFromPqDraft = async (header: IcRfqHeader): Promise<IcRfqHeader> => {
  try {
    const company = await createCompanyQueries().getById(header.sourceCompanyId);
    if (!company?.sapDbName) {
      return withRfqCustomerDisplay(withEnsuredRfqRemarks(header));
    }

    const dbName = company.sapDbName;
    const source = await resolveSourceDoc(dbName, header);
    if (!source) {
      logger.info({
        msg: "RFQ enrich: no buyer PQ found; returning base RFQ",
        pqDraftDocEntry: header.pqDraftDocEntry,
        rfqId: header.rfqId,
        sourceCompanyId: header.sourceCompanyId,
        status: header.status,
      });
      return withRfqCustomerDisplay(withEnsuredRfqRemarks(header));
    }

    const srcHeader = source.header;
    // Buyer-side vendor snapshot (routing audit only — not seller customer UI).
    const cardCode = toStr(srcHeader.CardCode ?? srcHeader.cardCode) ?? header.vendorCode;
    const vendorName =
      toStr(srcHeader.CardName ?? srcHeader.cardName) ??
      (await loadVendorName(dbName, cardCode)) ??
      null;

    const slpCode = toNum(srcHeader.SlpCode ?? srcHeader.slpCode);
    const buyerName = await loadBuyerName(dbName, slpCode);

    const sourceByLineNum = new Map<number, SourceLineRow>();
    for (const row of source.lines) {
      const lineNum = toNum(row.LineNum ?? row.lineNum);
      if (lineNum !== null) {
        sourceByLineNum.set(lineNum, row);
      }
    }

    const lines = (header.lines ?? []).map((line) =>
      mergeLine(line, sourceByLineNum.get(line.lineNum)),
    );

    const resolvedLines =
      lines.length > 0
        ? lines
        : source.lines.map((row, index) => {
            const lineNum = toNum(row.LineNum ?? row.lineNum) ?? index;
            const requiredQty = toNum(row.PQTReqQty) ?? 0;
            const quotedQty = toNum(row.Quantity) ?? 0;
            return {
              // Quoted date/qty only from ShipDate/Quantity — leave empty when buyer has not quoted.
              deliveryDate: toDateOnly(row.ShipDate),
              description: toStr(row.Dscription),
              discount: toNum(row.DiscPrcnt) ?? 0,
              itemCode: toStr(row.ItemCode) ?? "",
              lineNum,
              quantity: quotedQty > 0 ? quotedQty : 0,
              remarks: null,
              requiredDate: toDateOnly(row.PQTReqDate),
              requiredQuantity: requiredQty > 0 ? requiredQty : 0,
              rfqId: header.rfqId,
              rfqLineId: -1 * (lineNum + 1),
              taxCode: toStr(row.VatGroup ?? row.vatGroup ?? row.TaxCode),
              pqTaxCode: toStr(row.VatGroup ?? row.vatGroup ?? row.TaxCode),
              sqTaxCode: null,
              unitPrice: toNum(row.Price ?? row.PriceBefDi),
              uomCode: toStr(row.UomCode),
              warehouse: toStr(row.WhsCode),
            } satisfies IcRfqLine;
          });

    const firstWh =
      resolvedLines.find((line) => line.warehouse)?.warehouse ??
      toStr(source.lines[0]?.WhsCode) ??
      null;

    const draftComments = toStr(srcHeader.Comments ?? srcHeader.comments);
    const draftVendorRef = toStr(srcHeader.NumAtCard ?? srcHeader.numAtCard);
    const sourceDocNum = source.docNum;
    const pqDraftDocNum = header.pqDraftDocNum ?? sourceDocNum;

    const merged = withEnsuredRfqRemarks(
      {
        ...header,
        billToAddress: toStr(srcHeader.Address ?? srcHeader.address),
        buyerCode: slpCode != null ? String(slpCode) : null,
        buyerName,
        docDate: toDateOnly(srcHeader.DocDate ?? srcHeader.docDate),
        docDueDate: toDateOnly(srcHeader.DocDueDate ?? srcHeader.docDueDate),
        lines: resolvedLines,
        pqDraftDocNum,
        requiredDate: toDateOnly(srcHeader.DocDueDate ?? srcHeader.docDueDate),
        shipToAddress: toStr(srcHeader.Address2 ?? srcHeader.address2),
        // Keep routing vendor code from IC header when present; fall back to PQ CardCode.
        vendorCode: header.vendorCode || cardCode || "",
        vendorName,
        vendorRefNo: draftVendorRef ?? header.vendorRefNo ?? null,
        warehouseCode: firstWh,
      },
      draftComments,
    );
    // Seller UI: customer = buyer BP on seller books (not buyer-side vendor / RCM self).
    return withRfqCustomerDisplay(merged);
  } catch (err: unknown) {
    logger.warn({
      err: err instanceof Error ? err : new Error(String(err)),
      msg: "RFQ enrich from buyer PQ failed; returning base RFQ",
      pqDraftDocEntry: header.pqDraftDocEntry,
      rfqId: header.rfqId,
      sourceCompanyId: header.sourceCompanyId,
    });
    return withRfqCustomerDisplay(withEnsuredRfqRemarks(header));
  }
};
