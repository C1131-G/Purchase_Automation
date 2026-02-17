import { type POHeaderState, type POLineItemState } from '@/store/create/po-create.store'

type BuildPOPayloadInput = Pick<
  POHeaderState,
  'docDate' | 'docDueDate' | 'referenceNo' | 'comments' | 'warehouseCode'
> & {
  cardCode: string
  productRows: POLineItemState[]
}

export const buildPOPayload = ({
  cardCode,
  docDate,
  docDueDate,
  referenceNo,
  comments,
  warehouseCode,
  productRows,
}: BuildPOPayloadInput) => ({
  CardCode: cardCode.trim(),
  DocDate: docDate,
  DocDueDate: docDueDate,
  Comments: [referenceNo.trim(), comments.trim()].filter(Boolean).join(' | '),
  DocumentLines: productRows
    .filter((row) => row.productCode.trim())
    .map((row) => {
      const grossAmount = row.price * row.quantity
      const safeDiscountAmount = Math.max(0, Math.min(grossAmount, row.discountAmount))
      const discountPercent = grossAmount > 0 ? (safeDiscountAmount / grossAmount) * 100 : 0

      return {
        ItemCode: row.productCode,
        Quantity: row.quantity,
        UnitPrice: row.price,
        DiscountPercent: discountPercent,
        WarehouseCode: warehouseCode || undefined,
      }
    }),
})
