import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { CreatePageRouteSkeleton } from '@/components/skeleton/create-page-route-skeleton'
import { requireActiveSession } from '@/routes/_require-active-session'

/** PurchaseAPCreditMemoCreateRoute: Page for creating new AP Credit Memos. */
export const Route = createFileRoute('/_layout/purchase/create-ap-credit-memo')({
  validateSearch: (search) =>
    z
      .object({
        sourceDocNum: z.string().or(z.number()).transform(String).optional(),
        sourceDocType: z
          .enum(['PurchaseOrder', 'GoodsReceiptPO', 'APInvoice', 'APCreditMemo'])
          .optional(),
      })
      .parse(search),
  beforeLoad: async () => {
    await requireActiveSession()
  },
  pendingMs: 0,
  pendingComponent: CreatePageRouteSkeleton,
  component: RouteComponent,
})

function RouteComponent() {
  return <div className="p-6">Create AP Credit Memo Page (Coming Soon)</div>
}
