import { PurchaseOrderTable } from '@/features/purchase-orders/components/purchase-order-table'
import { purchaseOrderSearchSchema } from '@/features/purchase-orders/schemas/purchase-order-search.schema'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/purchase/orders')({
  validateSearch: (search) => purchaseOrderSearchSchema.parse(search),
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="h-full w-full">
      <PurchaseOrderTable />
    </div>
  )
}
