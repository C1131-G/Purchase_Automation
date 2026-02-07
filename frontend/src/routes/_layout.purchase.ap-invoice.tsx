import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/purchase/ap-invoice')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_layout/purchase/ap-invoice"!</div>
}
