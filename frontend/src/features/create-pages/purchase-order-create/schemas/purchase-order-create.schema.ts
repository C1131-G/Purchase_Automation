import { z } from 'zod'

export const purchaseOrderCreateLineSchema = z.object({
  productCode: z.string().min(1, 'Product is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  price: z.number().min(0, 'Price cannot be negative'),
  discountAmount: z.number().min(0, 'Discount amount cannot be negative'),
})

export const purchaseOrderCreateFormSchema = z.object({
  billToAddress: z.string().min(1, 'Bill-to address is required'),
  shipToAddress: z.string().min(1, 'Ship-to address is required'),
  referenceNo: z.string().optional().default(''),
  comments: z.string().optional().default(''),
})

export const purchaseOrderCreateSchema = z.object({
  vendorCode: z.string().min(1, 'Vendor is required'),
  vendorName: z.string().min(1, 'Vendor name is required'),
  docDueDate: z.string().min(1, 'Due date is required'),
  salesEmployee: z.string().min(1, 'Buyer is required'),
  warehouseCode: z.string().min(1, 'Warehouse is required'),
  billToAddress: purchaseOrderCreateFormSchema.shape.billToAddress,
  shipToAddress: purchaseOrderCreateFormSchema.shape.shipToAddress,
  referenceNo: purchaseOrderCreateFormSchema.shape.referenceNo,
  comments: purchaseOrderCreateFormSchema.shape.comments,
  lines: z.array(purchaseOrderCreateLineSchema).min(1, 'At least one line item is required'),
})

export type PurchaseOrderCreateInput = z.infer<typeof purchaseOrderCreateSchema>
export type PurchaseOrderCreateFormInput = z.infer<typeof purchaseOrderCreateFormSchema>
export type PurchaseOrderCreateLineInput = z.infer<typeof purchaseOrderCreateLineSchema>
