import { type PropsWithChildren } from 'react'

import {
  type LookupItem,
  type ProductLookupItem,
} from '@/features/create-pages/create-shared/api/create-shared.types'

export type PopupMode = 'vendor-name' | 'vendor-code' | 'warehouse' | 'sales-employee'
export type ActiveDatePicker = 'doc' | 'delivery' | null

export type CreateLookupOption = Pick<
  LookupItem,
  'code' | 'name' | 'billToAddress' | 'shipToAddress' | 'salesEmployeeCode' | 'salesEmployeeName'
> & {
  stock?: number | undefined
  disabled?: boolean
}

export type CreateSectionCardProps = PropsWithChildren<{
  title: string
  className?: string
}>

export type ProductGridRow = {
  id: string
  productCode: string
  productName: string
  stock: number
  price: number
  currency: string
  vatGroup: string
  taxRate: number
  uomCode?: string | undefined
  uomEntry?: number | undefined
  purchaseUomCode?: string | undefined
  purchaseUomEntry?: number | undefined
  quantity: number
  openQty?: number | undefined
  baseQuantity?: number | undefined
  discountPercent: number
  discountAmount: number
  comment: string
  warehouseCode: string
  lineNum?: number | undefined
  baseEntry?: number | undefined
  baseLine?: number | undefined
  baseType?: number | undefined
  selected?: boolean
  returnReason?: string
}

export type ProductGridRowDraft = {
  quantity?: string
  discountPercent?: string
  discountAmount?: string
}

export type LookupOption = CreateLookupOption
export type ProductRow = ProductGridRow
export type ProductRowDraft = ProductGridRowDraft
export type StockPreviewProduct = Pick<ProductLookupItem, 'code' | 'name'>
