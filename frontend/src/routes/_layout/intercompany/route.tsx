import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Intercompany layout shell — child routes: notifications (P8A), RFQ later (P8B).
 */
export const Route = createFileRoute("/_layout/intercompany")({
  component: IntercompanyLayoutRoute,
});

function IntercompanyLayoutRoute() {
  return (
    <div className="h-full w-full">
      <Outlet />
    </div>
  );
}
