import { toTrimmed, toNullableInt, toNumberOrZero } from "./master-data.lookup-cache";

export function mapProductResults(args: {
  items: any[];
  itemStocks: Array<{ ItemCode?: unknown; OnHand?: unknown }>;
  itemPrices: Array<{ ItemCode?: string; PriceList?: number; Price?: number }>;
  priceList: number | undefined;
  type: "sales" | "purchase" | undefined;
  defaultCurrency: string;
  taxGroups: Array<{ Code?: string; Rate?: unknown }>;
  uoms: Array<{ UomCode?: string; UomName?: string; UomEntry?: unknown; AbsEntry?: unknown }>;
  ugpLines: Array<{ UgpEntry?: unknown; UomEntry?: unknown; UomCode?: unknown; UomName?: unknown }>;
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
    ugpLines,
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

  const uomByNormalizedValue = new Map<string, { code: string; entry?: number }>();
  for (const uom of uoms) {
    const code = toTrimmed(uom.UomCode);
    const name = toTrimmed(uom.UomName);
    const entry = toNullableInt(uom.UomEntry ?? uom.AbsEntry);
    if (code) uomByNormalizedValue.set(code.toLowerCase(), { code, entry });
    if (name && code) uomByNormalizedValue.set(name.toLowerCase(), { code, entry });
  }

  const ugpUomMap = new Map<number, { code: string; name: string; entry?: number }[]>();
  for (const ugpLine of ugpLines) {
    const ugpEntry = toNullableInt(ugpLine.UgpEntry);
    if (ugpEntry === undefined || ugpEntry === -1) continue;
    const uomCode = toTrimmed(ugpLine.UomCode);
    const uomName = toTrimmed(ugpLine.UomName) || uomCode;
    const uomEntry = toNullableInt(ugpLine.UomEntry);
    if (!uomCode) continue;
    const list = ugpUomMap.get(ugpEntry) ?? [];
    if (!list.some((uom) => uom.code === uomCode)) {
      list.push({ code: uomCode, name: uomName, entry: uomEntry });
    }
    ugpUomMap.set(ugpEntry, list);
  }

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
    const resolvedSalesUom = uomByNormalizedValue.get(salesUomText.toLowerCase());
    const resolvedSalesUomCode = resolvedSalesUom?.code || salesUomText;
    const resolvedSalesUomEntry = resolvedSalesUom?.entry;
    const resolvedPurchaseUom = uomByNormalizedValue.get(purchaseUomText.toLowerCase());
    const resolvedPurchaseUomCode = resolvedPurchaseUom?.code || resolvedSalesUomCode;
    const resolvedPurchaseUomEntry = resolvedPurchaseUom?.entry ?? resolvedSalesUomEntry;
    const itemUgpEntry = toNullableInt(item.UgpEntry);
    let uomList: { code: string; name: string; entry?: number }[] = [];
    if (itemUgpEntry !== undefined && itemUgpEntry !== -1) {
      uomList = ugpUomMap.get(itemUgpEntry) ?? [];
    }
    if (uomList.length === 0) {
      if (resolvedPurchaseUomCode) {
        uomList.push({
          code: resolvedPurchaseUomCode,
          name: resolvedPurchaseUomCode,
          entry: resolvedPurchaseUomEntry,
        });
      }
      if (resolvedSalesUomCode && resolvedSalesUomCode !== resolvedPurchaseUomCode) {
        uomList.push({
          code: resolvedSalesUomCode,
          name: resolvedSalesUomCode,
          entry: resolvedSalesUomEntry,
        });
      }
    }

    return {
      Currency: resolvedCurrency,
      ItemCode: normalizedItemCode,
      ItemName: item.ItemName,
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
        uomList.find((uom) => uom.code === resolvedSalesUomCode)?.name ?? resolvedSalesUomCode,
      Uom: salesUomText,
      UomList: uomList,
      Warehouse: normalizedWarehouseCode || item.DfltWH || "",
      id: normalizedItemCode,
      productCode: normalizedItemCode,
      productName: item.ItemName,
      stock: resolvedStock,
      taxCode: resolvedTaxCode,
      taxRate: resolvedTaxRate,
    };
  });
}
