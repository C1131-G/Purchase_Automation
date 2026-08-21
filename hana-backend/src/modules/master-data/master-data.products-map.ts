import { toTrimmed, toNullableInt, toNumberOrZero } from "./master-data.lookup-cache";

type MasterUom = { code: string; name: string; entry?: number };

const isUsableUomCode = (code: string): boolean => Boolean(code) && !/^manual$/i.test(code);

const usableUomEntry = (value: unknown): number | undefined => {
  const entry = toNullableInt(value);
  return entry !== undefined && entry > 0 ? entry : undefined;
};

export function mapProductResults(args: {
  items: any[];
  itemStocks: Array<{ ItemCode?: unknown; OnHand?: unknown }>;
  itemPrices: Array<{ ItemCode?: string; PriceList?: number; Price?: number }>;
  priceList: number | undefined;
  type: "sales" | "purchase" | undefined;
  defaultCurrency: string;
  taxGroups: Array<{ Code?: string; Rate?: unknown }>;
  uoms: Array<{ UomCode?: string; UomName?: string; UomEntry?: unknown; AbsEntry?: unknown }>;
  normalizedWarehouseCode: string;
}) {
  const {
    items,
    itemStocks,
    itemPrices,
    priceList,
    type,
    taxGroups,
    uoms,
    normalizedWarehouseCode,
  } = args;
  let { defaultCurrency } = args;

  const stockMap = new Map<string, number>();
  for (const stockRow of itemStocks) {
    const itemCode = toTrimmed(stockRow.ItemCode);
    if (itemCode) stockMap.set(itemCode, toNumberOrZero(stockRow.OnHand));
  }

  const priceMap = new Map<string, number>();
  if (priceList === -1) {
    for (const item of items) {
      const itemCode = toTrimmed(item.ItemCode);
      if (itemCode) {
        const lastPurPrc = toNumberOrZero(item.LastPurPrc);
        priceMap.set(itemCode, lastPurPrc > 0 ? lastPurPrc : toNumberOrZero(item.AvgPrice));
      }
    }
  } else if (priceList === -2) {
    for (const item of items) {
      const itemCode = toTrimmed(item.ItemCode);
      if (itemCode) {
        const evalPrice = toNumberOrZero(item.LstEvlPric);
        const avgPrice = toNumberOrZero(item.AvgPrice);
        priceMap.set(itemCode, evalPrice > 0 ? evalPrice : avgPrice);
      }
    }
  } else {
    for (const priceRow of itemPrices) {
      const itemCode = toTrimmed(priceRow.ItemCode);
      if (!itemCode) continue;
      const candidatePrice = toNumberOrZero(priceRow.Price);
      if (priceList !== undefined) {
        priceMap.set(itemCode, candidatePrice);
      } else {
        const currentPrice = priceMap.get(itemCode) ?? 0;
        if (candidatePrice > currentPrice) priceMap.set(itemCode, candidatePrice);
      }
    }
  }

  const taxRateByCode = new Map<string, number>();
  for (const taxGroup of taxGroups) {
    const code = toTrimmed(taxGroup.Code);
    if (code) taxRateByCode.set(code, toNumberOrZero(taxGroup.Rate));
  }

  const uomByEntry = new Map<number, MasterUom>();
  const uomByNormalizedValue = new Map<string, MasterUom>();
  for (const uom of uoms) {
    const code = toTrimmed(uom.UomCode);
    const name = toTrimmed(uom.UomName) || code;
    const entry = usableUomEntry(uom.UomEntry ?? uom.AbsEntry);
    if (!code || !isUsableUomCode(code)) continue;
    const resolved: MasterUom = entry !== undefined ? { code, name, entry } : { code, name };
    if (entry !== undefined) uomByEntry.set(entry, resolved);
    uomByNormalizedValue.set(code.toLowerCase(), resolved);
    if (name) uomByNormalizedValue.set(name.toLowerCase(), resolved);
  }

  const resolveMasterUom = (text: string, entryFromItem: unknown): MasterUom | null => {
    const entry = usableUomEntry(entryFromItem);
    if (entry !== undefined) {
      const byEntry = uomByEntry.get(entry);
      if (byEntry) return byEntry;
      const fallbackCode = isUsableUomCode(text) ? text : "";
      if (fallbackCode) return { code: fallbackCode, name: fallbackCode, entry };
    }
    if (!isUsableUomCode(text)) return null;
    return uomByNormalizedValue.get(text.toLowerCase()) ?? { code: text, name: text };
  };

  const pushUniqueUom = (list: MasterUom[], next: MasterUom | null) => {
    if (!next || !isUsableUomCode(next.code)) return;
    if (list.some((uom) => uom.code === next.code)) return;
    list.push(next);
  };

  return items.map((item) => {
    const normalizedItemCode = toTrimmed(item.ItemCode);
    const resolvedStock = stockMap.get(normalizedItemCode) ?? 0;
    const resolvedPrice = priceMap.get(normalizedItemCode) ?? toNumberOrZero(item.AvgPrice);
    const resolvedCurrency = defaultCurrency || "";
    const resolvedTaxCode =
      type === "purchase"
        ? toTrimmed(item.VatGroupPu) || toTrimmed(item.VatGroupSa)
        : toTrimmed(item.VatGroupSa) || toTrimmed(item.VatGroupPu);
    const resolvedTaxRate = taxRateByCode.get(resolvedTaxCode) ?? 0;
    const salesUomText = toTrimmed(item.SalUnitMsr);
    const purchaseUomText = toTrimmed(item.BuyUnitMsr);
    const resolvedSalesUom = resolveMasterUom(salesUomText, item.SUoMEntry);
    const resolvedPurchaseUom = resolveMasterUom(purchaseUomText, item.PUoMEntry);
    const resolvedSalesUomCode = resolvedSalesUom?.code || "";
    const resolvedSalesUomEntry = resolvedSalesUom?.entry;
    const resolvedPurchaseUomCode = resolvedPurchaseUom?.code || "";
    const resolvedPurchaseUomEntry = resolvedPurchaseUom?.entry;
    const uomList: MasterUom[] = [];
    if (type === "purchase") {
      pushUniqueUom(uomList, resolvedPurchaseUom);
    } else {
      pushUniqueUom(uomList, resolvedSalesUom);
    }

    const substitute = toTrimmed(item.Substitute);
    const cardCode = toTrimmed(item.CardCode);
    const manBtchNum = toTrimmed(item.ManBtchNum).toUpperCase() === "Y" ? "Y" : "N";
    const manSerNum = toTrimmed(item.ManSerNum).toUpperCase() === "Y" ? "Y" : "N";

    return {
      Currency: resolvedCurrency,
      FrgnName: toTrimmed(item.FrgnName),
      ItemCode: normalizedItemCode,
      ItemName: item.ItemName,
      ManBtchNum: manBtchNum,
      ManSerNum: manSerNum,
      OnHand: resolvedStock,
      Price: resolvedPrice,
      PurchaseUoMCode: resolvedPurchaseUomCode,
      PurchaseUoMEntry: resolvedPurchaseUomEntry,
      PurchaseUom: purchaseUomText,
      TaxCode: resolvedTaxCode,
      TaxRate: resolvedTaxRate,
      UoMCode: resolvedSalesUomCode,
      UoMEntry: resolvedSalesUomEntry,
      UoMName:
        resolvedSalesUom?.name ||
        uomList.find((uom) => uom.code === resolvedSalesUomCode)?.name ||
        resolvedSalesUomCode,
      Uom: salesUomText,
      UomList: uomList,
      Warehouse: normalizedWarehouseCode || item.DfltWH || "",
      ...(cardCode ? { CardCode: cardCode } : {}),
      ...(substitute ? { Substitute: substitute } : {}),
      id: normalizedItemCode,
      manBtchNum,
      manSerNum,
      productCode: normalizedItemCode,
      foreignName: toTrimmed(item.FrgnName),
      productName: item.ItemName,
      stock: resolvedStock,
      taxCode: resolvedTaxCode,
      taxRate: resolvedTaxRate,
    };
  });
}
