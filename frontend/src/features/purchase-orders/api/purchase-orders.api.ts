export type PurchaseOrder = {
  DocEntry: number
  DocNum: number
  DocDate: string
  CardCode: string
  CardName: string
  DocTotal: string
  DocStatus: string
  Canceled: string
}

export const purchaseOrdersSampleData: PurchaseOrder[] = Array.from({ length: 250 }, (_, i) => {
  const statuses = ['Open', 'Closed']
  const canceledOptions = ['Yes', 'No']
  const day = String((i % 28) + 1).padStart(2, '0')
  const month = String((i % 12) + 1).padStart(2, '0')

  return {
    DocEntry: 100 + i,
    DocNum: 1000014 + i,
    DocDate: `2026-${month}-${day} 00:00:00.000000000`,
    CardCode: `C0${287 + (i % 10)}`, // Repeated groups for testing
    CardName: i % 2 === 0 ? 'KIA MOTORS LIMITED' : 'TATA MOTORS PVT LTD',
    DocTotal: (50 + Math.sin(i) * 30).toFixed(6), // Fluctuating totals
    DocStatus: statuses[i % statuses.length]!,
    Canceled: canceledOptions[i % 2]!,
  }
})
