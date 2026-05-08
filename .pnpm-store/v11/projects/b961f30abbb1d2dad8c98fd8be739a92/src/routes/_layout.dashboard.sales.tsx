import { createFileRoute } from "@tanstack/react-router";

/** SalesDashboard: High-level overview route for sales and distribution metrics. */
export const Route = createFileRoute("/_layout/dashboard/sales")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_layout/dashboard/sales"!</div>;
}
