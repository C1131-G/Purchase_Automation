import { z } from 'zod'

export const salesOrderCreateLineSchema = z.object({
  productCode: z.string().min(1, 'Product is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  price: z.number().min(0, 'Price cannot be negative'),
  discountAmount: z.number().min(0, 'Discount amount cannot be negative'),
})

export const salesOrderCreateFormSchema = z.object({
  billToAddress: z.string().min(1, 'Bill-to address is required'),
  shipToAddress: z.string().min(1, 'Ship-to address is required'),
  referenceNo: z.string().optional().default(''),
  comments: z.string().optional().default(''),
})

export const salesOrderCreateSchema = z.object({
  vendorCode: z.string().min(1, 'Customer is required'),
  vendorName: z.string().min(1, 'Customer name is required'),
  docDueDate: z.string().min(1, 'Due date is required'),
  salesEmployee: z.string().min(1, 'Sales employee is required'),
  warehouseCode: z.string().min(1, 'Warehouse is required'),
  billToAddress: salesOrderCreateFormSchema.shape.billToAddress,
  shipToAddress: salesOrderCreateFormSchema.shape.shipToAddress,
  referenceNo: salesOrderCreateFormSchema.shape.referenceNo,
  comments: salesOrderCreateFormSchema.shape.comments,
  lines: z.array(salesOrderCreateLineSchema).min(1, 'At least one line item is required'),
})

export type SalesOrderCreateInput = z.infer<typeof salesOrderCreateSchema>
export type SalesOrderCreateFormInput = z.infer<typeof salesOrderCreateFormSchema>
export type SalesOrderCreateLineInput = z.infer<typeof salesOrderCreateLineSchema>
