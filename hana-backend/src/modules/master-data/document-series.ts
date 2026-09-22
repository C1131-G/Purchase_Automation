/**
 * Document numbering series (NNM1.Series) for marketing documents.
 * Same rule as the POS: payload Series wins; otherwise the series whose Remarks equals the
 * POS store location of the first line's warehouse. No match → no Series (SAP default).
 */
import { logger } from "@/core/logger/pino-logger";
import {
  getWarehouseStoreLocation,
  resolveLocationSeries,
} from "@/modules/master-data/master-data.store-location-series.queries";

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
  logLabel?: string;
}) => {
  const payloadSeries = pickSapSeries({
    Series: params.clientPayload.Series ?? params.clientPayload.series,
  });
  let series = payloadSeries ?? null;
  let location: string | null = null;

  const warehouseCode = String(params.warehouseCode ?? "").trim();
  if (series == null && warehouseCode) {
    location = await getWarehouseStoreLocation(params.dbName, warehouseCode);
    if (location) {
      series = await resolveLocationSeries(params.dbName, params.objectCode, location);
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
