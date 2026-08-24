/** Create Shared Mapper: Universal mappers for master data and creation payloads. */
import type {
  LookupItem,
  ProductLookupItem,
  ProductWarehouseStockItem,
} from "@/features/create-pages/create-shared/api/create-shared.types";
import { isUnresolvedCurrency } from "@/shared/utils/currency";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

export const unwrapMasterData = (response: unknown): unknown[] => {
  if (Array.isArray(response)) {
    return response;
  }
  const record = asRecord(response);
  if (!record) {
    return [];
  }
  if (Array.isArray(record.data)) {
    return asArray(record.data);
  }
  if (Array.isArray(record.value)) {
    return asArray(record.value);
  }
  const nestedData = asRecord(record.data);
  if (nestedData && Array.isArray(nestedData.value)) {
    return asArray(nestedData.value);
  }
  return [];
};

export const mapLookup = (item: unknown): LookupItem => {
  const record = asRecord(item) ?? {};
  const rawBranch = record.branchId ?? record.BPLid ?? record.BPLId ?? record.bplId;
  let branchId: number | null | undefined;
  if (rawBranch != null && rawBranch !== "") {
    const num = Number(rawBranch);
    branchId = Number.isFinite(num) && num > 0 ? Math.trunc(num) : null;
  }
  const category = String(record.category ?? record.Category ?? "")
    .trim()
    .toUpperCase();
  return {
    code: String(record.code ?? record.Code ?? record.CardCode ?? record.ItemCode ?? ""),
    name: String(record.name ?? record.Name ?? record.CardName ?? record.ItemName ?? ""),
    rate: Number(record.rate ?? record.Rate ?? 0),
    ...(category ? { category } : {}),
    ...(branchId !== undefined ? { branchId } : {}),
  };
};

export const mapSeriesLookup = (item: unknown): LookupItem => {
  const record = asRecord(item) ?? {};
  const mapped = mapLookup(item);
  const nextRaw = Number(record.nextNumber ?? record.NextNumber);
  const nextNumber = Number.isFinite(nextRaw) && nextRaw > 0 ? Math.trunc(nextRaw) : null;
  return {
    ...mapped,
    nextNumber,
  };
};

export const mapVendorLookup = (item: unknown): LookupItem => {
  const record = asRecord(item) ?? {};
  const billTo = String(
    record.billToAddress ?? record.BillToAddress ?? record.Address ?? "",
  ).trim();
  const shipTo = String(record.shipToAddress ?? record.ShipToAddress ?? "").trim();

  const rawAddresses = asArray(record.addresses ?? record.Addresses);
  const addresses = rawAddresses.map((addr) => {
    const r = asRecord(addr) ?? {};
    return {
      addressName: String(r.addressName ?? r.AddressName ?? ""),
      addressType: String(r.addressType ?? r.AddressType ?? "B") as "B" | "S",
      addressText: String(r.addressText ?? r.AddressText ?? ""),
    };
  });

  const rawCurrency = String(record.Currency ?? record.currency ?? "").trim();
  // SAP local "$" is not a real code — leave undefined so create flows use env/backend resolve.
  const currency = isUnresolvedCurrency(rawCurrency) ? undefined : rawCurrency;

  const mappedShipTo = shipTo || billTo;

  return {
    addresses,
    billToAddress: billTo,
    code: String(record.CardCode ?? record.cardCode ?? record.code ?? record.Code ?? ""),
    currency,
    name: String(record.CardName ?? record.cardName ?? record.name ?? record.Name ?? ""),
    salesEmployeeCode:
      (record.salesEmployeeCode as string | number | undefined) ??
      (record.SalesEmployeeCode as string | number | undefined) ??
      (record.SlpCode as string | number | undefined),
    salesEmployeeName: String(
      record.salesEmployeeName ?? record.SalesEmployeeName ?? record.SlpName ?? "",
    ),
    shipToAddress: mappedShipTo,
  };
};

export const toNumberOrZero = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const normalized = value.replaceAll(",", "").trim();
    if (!normalized) {
      return 0;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const nested =
      record.value ?? record.Value ?? record.amount ?? record.Amount ?? record.number ?? null;
    if (nested !== null) {
      return toNumberOrZero(nested);
    }
    const parsed = Number(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const mapProductLookup = (item: unknown): ProductLookupItem => {
  const record = asRecord(item) ?? {};
  const rawCurrency = String(
    record.Currency ?? record.currency ?? record.CurrCode ?? record.currCode ?? "",
  ).trim();
  const stockValue =
    record.OnHand ??
    record.onHand ??
    record.stock ??
    record.Stock ??
    record.InStock ??
    record.inStock ??
    record.Available ??
    record.available ??
    record.QtyOnHand ??
    record.qtyOnHand ??
    record.Quantity ??
    record.quantity;
  return {
    code: String(record.ItemCode ?? record.itemCode ?? record.code ?? record.Code ?? ""),
    currency: rawCurrency,
    defaultWarehouse: String(
      record.Warehouse ??
        record.warehouse ??
        record.DfltWH ??
        record.dfltWH ??
        record.DefaultWH ??
        record.defaultWarehouse ??
        "",
    ).trim(),
    foreignName: String(record.FrgnName ?? record.frgnName ?? record.foreignName ?? "").trim(),
    lastPurchaseCurrency: String(
      record.LastPurchaseCurrency ?? record.lastPurchaseCurrency ?? "",
    ).trim(),
    lastPurchasePrice: toNumberOrZero(record.LastPurchasePrice ?? record.lastPurchasePrice ?? 0),
    name: String(record.ItemName ?? record.itemName ?? record.name ?? record.Name ?? ""),
    price: toNumberOrZero(record.Price ?? record.price ?? record.AvgPrice),
    purchaseUomCode: String(
      record.PurchaseUoMCode ??
        record.purchaseUomCode ??
        record.PurchaseUomCode ??
        record.purchaseUom ??
        record.PurchaseUom ??
        record.BuyUnitMsr ??
        "",
    ).trim(),
    purchaseUomEntry:
      toNumberOrZero(
        record.PurchaseUoMEntry ??
          record.purchaseUomEntry ??
          record.PurchaseUomEntry ??
          record.PUoMEntry ??
          record.pUoMEntry,
      ) || undefined,
    stock: toNumberOrZero(stockValue),
    taxRate: toNumberOrZero(record.TaxRate ?? record.taxRate ?? record.Rate),
    uomCode: String(
      record.UoMCode ??
        record.uomCode ??
        record.UomCode ??
        record.uom ??
        record.Uom ??
        record.SalUnitMsr ??
        "",
    ).trim(),
    uomName:
      String(
        record.UoMName ??
          record.uomName ??
          record.UomName ??
          record.uomNameText ??
          record.Uom ??
          record.uom ??
          record.UoMCode ??
          record.uomCode ??
          "",
      ).trim() || undefined,
    uomEntry:
      toNumberOrZero(
        record.UoMEntry ??
          record.uomEntry ??
          record.UomEntry ??
          record.SUoMEntry ??
          record.sUoMEntry,
      ) || undefined,
    uomList: (() => {
      const rawList = record.UomList ?? record.uomList ?? record.UoMList;
      if (!Array.isArray(rawList)) return undefined;
      const mapped: { code: string; name: string; uomEntry?: number }[] = [];
      for (const u of rawList) {
        const uRec = asRecord(u) ?? {};
        const code = String(uRec.code ?? uRec.UomCode ?? uRec.uomCode ?? "").trim();
        if (!code) continue;
        const entry = toNumberOrZero(uRec.entry ?? uRec.uomEntry ?? uRec.UomEntry) || undefined;
        mapped.push({
          code,
          name: String(uRec.name ?? uRec.UomName ?? uRec.uomName ?? code).trim() || code,
          ...(entry !== undefined ? { uomEntry: entry } : {}),
        });
      }
      return mapped.length > 0 ? mapped : undefined;
    })(),
    vatGroup: String(
      record.vatGroup ??
        record.TaxCode ??
        record.taxCode ??
        record.VatGroupPu ??
        record.vatGroupPu ??
        record.VatGroupSa ??
        record.vatGroupSa ??
        record.VatGourpPu ??
        record.vatGourpPu ??
        "",
    ).trim(),
    manSerNum: String(record.manSerNum ?? record.ManSerNum ?? "N").trim() || "N",
    manBtchNum: String(record.manBtchNum ?? record.ManBtchNum ?? "N").trim() || "N",
  };
};

export const mapProductWarehouseStock = (item: unknown): ProductWarehouseStockItem => {
  const record = asRecord(item) ?? {};
  const stockValue =
    record.stock ??
    record.Stock ??
    record.OnHand ??
    record.onHand ??
    record.InStock ??
    record.inStock ??
    record.Available ??
    record.available ??
    record.QtyOnHand ??
    record.qtyOnHand ??
    record.Quantity ??
    record.quantity;
  return {
    code: String(record.code ?? record.Code ?? record.WhsCode ?? ""),
    name: String(record.name ?? record.Name ?? record.WhsName ?? ""),
    stock: toNumberOrZero(stockValue),
  };
};

export const mapSalesEmployeeLookup = (item: unknown): LookupItem => {
  const record = asRecord(item) ?? {};
  return {
    code: String(record.code ?? record.Code ?? record.id ?? ""),
    name: String(record.name ?? record.Name ?? ""),
  };
};

export const normalizeLookups = (items: LookupItem[]): LookupItem[] => {
  const seen = new Set<string>();
  const normalized: LookupItem[] = [];

  for (const item of items) {
    const code = item.code.trim();
    const name = item.name.trim();
    if (!code || !name) {
      continue;
    }
    const key = `${code}::${name}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push({ ...item, code, name });
  }

  return normalized;
};
