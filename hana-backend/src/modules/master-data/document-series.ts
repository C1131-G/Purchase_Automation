/**
 * Document numbering series (NNM1.Series) for marketing documents and payments.
 * Payload Series wins; otherwise pick unlocked non-manual series for the branch, then company default.
 */
import { logger } from "@/core/logger/pino-logger";
import { resolveDocumentSeries } from "@/modules/master-data/master-data.service";

export const SAP_SERIES_OBJECT = {
  apCreditMemo: "19",
  apInvoice: "18",
  goodsReceiptPO: "20",
  outgoingPayment: "46",
  purchaseOrder: "22",
  purchaseQuotation: "540000006",
  salesQuotation: "23",
} as const;

export const assignDocumentSeries = async (params: {
  dbName: string;
  objectCode: string;
  sapPayload: Record<string, unknown>;
  clientPayload: Record<string, unknown>;
  branchId?: number | null;
  logLabel?: string;
}) => {
  const seriesResolve = await resolveDocumentSeries(params.dbName, params.objectCode, {
    branchId: params.branchId ?? null,
    payloadSeries: params.clientPayload.Series ?? params.clientPayload.series,
  });
  if (seriesResolve) {
    params.sapPayload.Series = seriesResolve.series;
  }
  logger.info({
    branchId: params.branchId ?? null,
    companyDB: params.dbName,
    msg: params.logLabel ?? "Document series assignment",
    objectCode: params.objectCode,
    series: seriesResolve?.series ?? null,
    seriesNextNumber: seriesResolve?.nextNumber ?? null,
    seriesSource: seriesResolve?.source ?? null,
  });
  return seriesResolve;
};
