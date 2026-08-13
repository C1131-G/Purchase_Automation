import { executeTenantQuery } from "@/db/tenant-query";

import { toNumberOrZero, toTrimmed } from "./master-data.lookup-cache";

const sqlLiteral = (value: string): string => value.replaceAll("'", "''");

export type ItemBatchLookup = {
  admissionDate: string;
  batchNumber: string;
  expiryDate: string;
  manufacturingDate: string;
  notes: string;
  quantity: number;
};

export type ItemSerialLookup = {
  expiryDate: string;
  internalSerialNumber: string;
  manufacturerSerialNumber: string;
  manufacturingDate: string;
};

export const getItemBatches = async (
  dbName: string,
  itemCode?: string,
  warehouseCode?: string,
): Promise<ItemBatchLookup[]> => {
  const item = toTrimmed(itemCode);
  const warehouse = toTrimmed(warehouseCode);
  if (!item || !warehouse) {
    return [];
  }

  try {
    const rows = (await executeTenantQuery(
      dbName,
      `SELECT obtn."DistNumber" AS "BatchNumber",
              obtq."Quantity" AS "Quantity",
              obtn."ExpDate" AS "ExpiryDate",
              obtn."MnfDate" AS "ManufacturingDate",
              obtn."InDate" AS "AdmissionDate",
              obtn."Notes" AS "Notes"
         FROM OBTQ obtq
         INNER JOIN OBTN obtn
           ON obtq."MdAbsEntry" = obtn."AbsEntry"
          AND obtq."ItemCode" = obtn."ItemCode"
        WHERE obtq."ItemCode" = '${sqlLiteral(item)}'
          AND obtq."WhsCode" = '${sqlLiteral(warehouse)}'
          AND obtq."Quantity" > 0
        ORDER BY obtn."DistNumber" ASC`,
    )) as Array<{
      AdmissionDate?: unknown;
      BatchNumber?: unknown;
      ExpiryDate?: unknown;
      ManufacturingDate?: unknown;
      Notes?: unknown;
      Quantity?: unknown;
    }>;

    const mapped: ItemBatchLookup[] = [];
    for (const row of rows) {
      const batchNumber = toTrimmed(row.BatchNumber);
      if (!batchNumber) {
        continue;
      }
      mapped.push({
        admissionDate: toTrimmed(row.AdmissionDate),
        batchNumber,
        expiryDate: toTrimmed(row.ExpiryDate),
        manufacturingDate: toTrimmed(row.ManufacturingDate),
        notes: toTrimmed(row.Notes),
        quantity: toNumberOrZero(row.Quantity),
      });
    }
    return mapped;
  } catch {
    return [];
  }
};

export const getItemSerials = async (
  dbName: string,
  itemCode?: string,
  warehouseCode?: string,
): Promise<ItemSerialLookup[]> => {
  const item = toTrimmed(itemCode);
  const warehouse = toTrimmed(warehouseCode);
  if (!item || !warehouse) {
    return [];
  }

  const fromOsrq = await loadSerialsFromOsrq(dbName, item, warehouse);
  if (fromOsrq.length > 0) {
    return fromOsrq;
  }
  return loadSerialsFromOsri(dbName, item, warehouse);
};

async function loadSerialsFromOsrq(
  dbName: string,
  item: string,
  warehouse: string,
): Promise<ItemSerialLookup[]> {
  try {
    const rows = (await executeTenantQuery(
      dbName,
      `SELECT osrn."DistNumber" AS "InternalSerialNumber",
              osrn."MnfSerial" AS "ManufacturerSerialNumber",
              osrn."ExpDate" AS "ExpiryDate",
              osrn."MnfDate" AS "ManufacturingDate"
         FROM OSRQ osrq
         INNER JOIN OSRN osrn
           ON osrq."MdAbsEntry" = osrn."AbsEntry"
          AND osrq."ItemCode" = osrn."ItemCode"
        WHERE osrq."ItemCode" = '${sqlLiteral(item)}'
          AND osrq."WhsCode" = '${sqlLiteral(warehouse)}'
          AND osrq."Quantity" > 0
        ORDER BY osrn."DistNumber" ASC`,
    )) as Array<{
      ExpiryDate?: unknown;
      InternalSerialNumber?: unknown;
      ManufacturerSerialNumber?: unknown;
      ManufacturingDate?: unknown;
    }>;
    return mapSerialRows(rows);
  } catch {
    return [];
  }
}

async function loadSerialsFromOsri(
  dbName: string,
  item: string,
  warehouse: string,
): Promise<ItemSerialLookup[]> {
  try {
    const rows = (await executeTenantQuery(
      dbName,
      `SELECT osri."IntrSerial" AS "InternalSerialNumber",
              osri."SuppSerial" AS "ManufacturerSerialNumber",
              osri."ExpDate" AS "ExpiryDate",
              osri."MnfDate" AS "ManufacturingDate"
         FROM OSRI osri
        WHERE osri."ItemCode" = '${sqlLiteral(item)}'
          AND osri."WhsCode" = '${sqlLiteral(warehouse)}'
          AND osri."Status" = 0
        ORDER BY osri."IntrSerial" ASC`,
    )) as Array<{
      ExpiryDate?: unknown;
      InternalSerialNumber?: unknown;
      ManufacturerSerialNumber?: unknown;
      ManufacturingDate?: unknown;
    }>;
    return mapSerialRows(rows);
  } catch {
    return [];
  }
}

function mapSerialRows(
  rows: Array<{
    ExpiryDate?: unknown;
    InternalSerialNumber?: unknown;
    ManufacturerSerialNumber?: unknown;
    ManufacturingDate?: unknown;
  }>,
): ItemSerialLookup[] {
  const mapped: ItemSerialLookup[] = [];
  for (const row of rows) {
    const internalSerialNumber = toTrimmed(row.InternalSerialNumber);
    if (!internalSerialNumber) {
      continue;
    }
    mapped.push({
      expiryDate: toTrimmed(row.ExpiryDate),
      internalSerialNumber,
      manufacturerSerialNumber: toTrimmed(row.ManufacturerSerialNumber),
      manufacturingDate: toTrimmed(row.ManufacturingDate),
    });
  }
  return mapped;
}
