import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft } from "lucide-react";

import { Button } from "@/components/button";

/**
 * NotFound: Catch-all error view for non-existent routes.
 * DESIGN: Minimalist flex-centered layout with recovery "Go home" action.
 */
export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6">
      <div className="flex w-full max-w-lg flex-col items-center gap-3 rounded-xl border border-linen-200 bg-surface px-6 py-6 text-center shadow-sm">
        <div className="flex size-9 items-center justify-center rounded-full bg-teal-50 text-teal-600 ring-1 ring-teal-100">
          <AlertTriangle className="size-5" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold leading-tight text-ink-900">Page not found</h1>
          <p className="mx-auto max-w-[46ch] text-sm leading-relaxed text-neutral-500">
            The page you requested does not exist or may have been moved.
          </p>
        </div>
        <Button
          type="button"
          className="mt-1 h-9 gap-1.5 rounded-md border border-teal-200 bg-teal-50 px-3 text-xs font-medium text-teal-700 shadow-none hover:bg-teal-100"
          onClick={() => navigate({ to: "/" })}
        >
          <ArrowLeft className="size-3.5" />
          Go home
        </Button>
      </div>
    </div>
  );
}
