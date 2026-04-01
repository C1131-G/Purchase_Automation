/** Create Shared Mapper: Universal mappers for master data and creation payloads. */
import {
  type LookupItem,
  type ProductLookupItem,
  type ProductWarehouseStockItem,
} from '@/features/create-pages/create-shared/api/create-shared.types'
import { reconcileAddresses } from '@/features/create-pages/create-shared/utils/address.utils'

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

export const unwrapMasterData = (response: unknown): unknown[] => {
  if (Array.isArray(response)) return response
  const record = asRecord(response)
  if (!record) return []
  if (Array.isArray(record.data)) return asArray(record.data)
  if (Array.isArray(record.value)) return asArray(record.value)
  const nestedData = asRecord(record.data)
  if (nestedData && Array.isArray(nestedData.value)) return asArray(nestedData.value)
  return []
}

export const mapLookup = (item: unknown): LookupItem => {
  const record = asRecord(item) ?? {}
  return {
    code: String(record.code ?? record.Code ?? record.CardCode ?? record.ItemCode ?? ''),
    name: String(record.name ?? record.Name ?? record.CardName ?? record.ItemName ?? ''),
    rate: Number(record.rate ?? record.Rate ?? 0),
  }
}

export const mapVendorLookup = (item: unknown): LookupItem => {
  const record = asRecord(item) ?? {}
  const billTo = String(record.billToAddress ?? record.BillToAddress ?? record.Address ?? '').trim()
  const shipTo = String(record.shipToAddress ?? record.ShipToAddress ?? '').trim()

  return {
    code: String(record.CardCode ?? record.cardCode ?? record.code ?? record.Code ?? ''),
    name: String(record.CardName ?? record.cardName ?? record.name ?? record.Name ?? ''),
    billToAddress: billTo,
    shipToAddress: reconcileAddresses(billTo, shipTo),
    salesEmployeeCode:
      (record.salesEmployeeCode as string | number | undefined) ??
      (record.SalesEmployeeCode as string | number | undefined) ??
      (record.SlpCode as string | number | undefined),
    salesEmployeeName: String(
      record.salesEmployeeName ?? record.SalesEmployeeName ?? record.SlpName ?? '',
    ),
  }
}

export const toNumberOrZero = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const normalized = value.replaceAll(',', '').trim()
    if (!normalized) return 0
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const nested =
      record.value ?? record.Value ?? record.amount ?? record.Amount ?? record.number ?? null
    if (nested !== null) return toNumberOrZero(nested)
    const parsed = Number(String(value))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export const mapProductLookup = (item: unknown): ProductLookupItem => {
  const record = asRecord(item) ?? {}
  const rawCurrency = String(
    record.Currency ?? record.currency ?? record.CurrCode ?? record.currCode ?? '',
  ).trim()
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
    record.quantity
  return {
    code: String(record.ItemCode ?? record.itemCode ?? record.code ?? record.Code ?? ''),
    name: String(record.ItemName ?? record.itemName ?? record.name ?? record.Name ?? ''),
    stock: toNumberOrZero(stockValue),
    price: toNumberOrZero(record.Price ?? record.price ?? record.AvgPrice),
    currency: rawCurrency,
    taxCode: String(
      record.TaxCode ||
        record.taxCode ||
        record.VatGroupPu ||
        record.vatGroupPu ||
        record.VatGourpPu ||
        record.vatGourpPu ||
        '',
    ).trim(),
    taxRate: toNumberOrZero(record.TaxRate ?? record.taxRate ?? record.Rate),
    uomCode: String(
      record.UoMCode ??
        record.uomCode ??
        record.UomCode ??
        record.uom ??
        record.Uom ??
        record.SalUnitMsr ??
        '',
    ).trim(),
    uomEntry: toNumberOrZero(record.UoMEntry ?? record.uomEntry ?? record.UomEntry) || undefined,
    purchaseUomCode: String(
      record.PurchaseUoMCode ??
        record.purchaseUomCode ??
        record.PurchaseUomCode ??
        record.purchaseUom ??
        record.PurchaseUom ??
        record.BuyUnitMsr ??
        '',
    ).trim(),
    purchaseUomEntry:
      toNumberOrZero(
        record.PurchaseUoMEntry ?? record.purchaseUomEntry ?? record.PurchaseUomEntry,
      ) || undefined,
  }
}

export const mapProductWarehouseStock = (item: unknown): ProductWarehouseStockItem => {
  const record = asRecord(item) ?? {}
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
    record.quantity
  return {
    code: String(record.code ?? record.Code ?? record.WhsCode ?? ''),
    name: String(record.name ?? record.Name ?? record.WhsName ?? ''),
    stock: toNumberOrZero(stockValue),
  }
}

export const mapSalesEmployeeLookup = (item: unknown): LookupItem => {
  const record = asRecord(item) ?? {}
  return {
    code: String(record.code ?? record.Code ?? record.id ?? ''),
    name: String(record.name ?? record.Name ?? ''),
  }
}

export const normalizeLookups = (items: LookupItem[]): LookupItem[] => {
  const seen = new Set<string>()
  const normalized: LookupItem[] = []

  for (const item of items) {
    const code = item.code.trim()
    const name = item.name.trim()
    if (!code || !name) continue
    const key = `${code}::${name}`
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push({ ...item, code, name })
  }

  return normalized
}
