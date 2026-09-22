/**
 * Document numbering series (NNM1.Series) for marketing documents.
 * Payload Series wins; otherwise the series whose Remarks equals the SAP location (OWHS.Location → OLCT) of the
 * first line's warehouse AND whose branch (NNM1.BPLId) equals the document branch.
 * No series matching both → no Series (SAP default).
 */
import { logger } from "@/core/logger/pino-logger";
import {
  getWarehouseLocation,
  resolveLocationSeries,
} from "@/modules/master-data/master-data.warehouse-location-series.queries";

export const SAP_SERIES_OBJECT = {
  purchaseOrder: "22",
  purchaseQuotation: "540000006",
  salesQuotation: "23",
} as const;

/** SAP Service Layer header Series (NNM1). Used by edit pages to show the assigned series. */
export const pickSapSeries = (result: unknown): number | undefined => {
  if (!result || typeof result !== "object") {
    return undefined;
  }
  const raw = (result as Record<string, unknown>).Series;
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) {
    return undefined;
  }
  return Math.trunc(num);
};

export const assignDocumentSeries = async (params: {
  dbName: string;
  objectCode: string;
  sapPayload: Record<string, unknown>;
  clientPayload: Record<string, unknown>;
  warehouseCode?: string | null;
  /** Document branch (BPL_IDAssignedToInvoice) the series must belong to. */
  branchId?: number | null;
  logLabel?: string;
}) => {
  const payloadSeries = pickSapSeries({
    Series: params.clientPayload.Series ?? params.clientPayload.series,
  });
  let series = payloadSeries ?? null;
  let location: string | null = null;

  const warehouseCode = String(params.warehouseCode ?? "").trim();
  const branchId = params.branchId ?? null;
  if (series == null && warehouseCode && branchId != null) {
    location = await getWarehouseLocation(params.dbName, warehouseCode);
    if (location) {
      series = await resolveLocationSeries(params.dbName, params.objectCode, location, branchId);
    }
  }

  let seriesSource: "payload" | "location" | null = null;
  if (payloadSeries != null) {
    seriesSource = "payload";
  } else if (series != null) {
    seriesSource = "location";
  }

  if (series != null) {
    params.sapPayload.Series = series;
  }
  logger.info({
    branchId,
    companyDB: params.dbName,
    location,
    msg: params.logLabel ?? "Document series assignment",
    objectCode: params.objectCode,
    series,
    seriesSource,
    warehouseCode: warehouseCode || null,
  });
  return series;
};
