import { goeyToast } from "goey-toast";
import { useCallback, useEffect, useRef } from "react";

/** The type of user-triggered action that caused a refetch. */
export type TableFetchAction = "sorting" | "filtering" | "searching" | "paginating" | "fetching";

interface UseTableToastProps {
  isFetching: boolean;
  hasData: boolean;
  /** Which action triggered the current fetch – drives the toast message. */
  action?: TableFetchAction;
  onSettled?: () => void;
}

const ACTION_MESSAGES: Record<TableFetchAction, string> = {
  fetching: "Loading data…",
  filtering: "Searching / Filtering…",
  paginating: "Loading page…",
  searching: "Searching…",
  sorting: "Sorting…",
};
const TOAST_COOLDOWN_MS = 900;

/**
 * Action-specific background loading toast.
 *
 * Shows a non-blocking `goeyToast` while React Query is actively fetching
 * in the background (stale data already visible). The message reflects the
 * action that triggered the fetch. Dismissed automatically when done.
 */
export function useTableToast({
  isFetching,
  hasData,
  action = "fetching",
  onSettled,
}: UseTableToastProps) {
  const toastIdRef = useRef<string | number | null>(null);
  const wasFetchingRef = useRef(false);
  const lastToastKeyRef = useRef<string | null>(null);
  const lastToastAtRef = useRef(0);

  const dismissToast = useCallback(() => {
    if (toastIdRef.current !== null) {
      goeyToast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  }, []);

  const showToast = useCallback(
    (nextAction: TableFetchAction) => {
      const nextMessage = ACTION_MESSAGES[nextAction];
      const now = Date.now();
      const isDuplicateWithinCooldown =
        lastToastKeyRef.current === nextMessage && now - lastToastAtRef.current < TOAST_COOLDOWN_MS;
      if (isDuplicateWithinCooldown) {
        return;
      }

      dismissToast();
      toastIdRef.current = goeyToast.info(nextMessage, {
        duration: 24 * 60 * 60 * 1000,
      });
      lastToastKeyRef.current = nextMessage;
      lastToastAtRef.current = now;
    },
    [dismissToast],
  );

  useEffect(() => {
    if (!hasData) {
      dismissToast();
      wasFetchingRef.current = false;
      return;
    }

    // Only surface toasts for user-triggered actions.
    if (action === "fetching") {
      dismissToast();
      wasFetchingRef.current = false;
      return;
    }

    if (isFetching) {
      wasFetchingRef.current = true;
      if (toastIdRef.current === null) {
        showToast(action);
      }
      return;
    }

    if (wasFetchingRef.current) {
      dismissToast();
      wasFetchingRef.current = false;
      onSettled?.();
    }
  }, [isFetching, hasData, action, dismissToast, showToast, onSettled]);

  useEffect(
    () => () => {
      dismissToast();
    },
    [dismissToast],
  );
}
