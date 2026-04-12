import { useMemo, useState } from 'react'

type GRPOCreateLine = {
  id: string
  productCode: string
  productName: string
  stock: number
  currency: string
  vatGroup: string
  taxRate: number
  baseQuantity?: number
  quantity: number
  discountPercent: number
  discountAmount: number
  comment: string
  price: number
  warehouseCode: string
  baseLine?: number | undefined
  baseEntry?: number | undefined
  baseType?: number | undefined
}

export function useGrpoProducts() {
  const [rows, setRows] = useState<GRPOCreateLine[]>([])

  const total = useMemo(
    () =>
      rows.reduce((sum, row) => {
        const gross = row.quantity * row.price
        const safeDiscount = Math.max(0, Math.min(gross, Number(row.discountAmount) || 0))
        return sum + (gross - safeDiscount)
      }, 0),
    [rows],
  )

  const setRowQuantity = (rowId: string, nextQuantity: number) => {
    setRows((prev) =>
      prev.map((item) => {
        if (item.id !== rowId) return item
        return { ...item, quantity: Math.max(0, nextQuantity) }
      }),
    )
  }

  const setRowZero = (rowId: string) => {
    setRows((prev) => prev.map((item) => (item.id === rowId ? { ...item, quantity: 0 } : item)))
  }

  return {
    rows,
    setRows,
    total,
    setRowQuantity,
    setRowZero,
  }
}
