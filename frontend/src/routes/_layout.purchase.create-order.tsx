import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/purchase/create-order')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_layout/purchase/create-order"!</div>
}
