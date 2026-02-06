import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/dashboard/purchase')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_layout/dashboard/purchase"!</div>
}
