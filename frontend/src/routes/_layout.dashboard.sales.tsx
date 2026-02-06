import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/dashboard/sales')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_layout/dashboard/sales"!</div>
}
