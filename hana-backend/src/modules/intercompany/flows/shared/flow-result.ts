// Shared IC hook / orchestrator result — never throws into PO/PQ create paths.

export type IcHookResult =
  | { status: "skipped"; reason: string }
  | {
      status: "success";
      mappingId?: number;
      targetDoc?: { type: string; entry: number; num?: number };
    }
  | { status: "queued_retry"; retryId: number }
  | { status: "failed"; message: string; historyId?: number }
  /** Hook accepted work; Flow 1/2 create or IC edit sync runs after the main doc HTTP response. */
  | { status: "accepted"; flow: "flow1" | "flow2" | "edit"; message?: string };

export const skipResult = (reason: string): IcHookResult => ({
  reason,
  status: "skipped",
});

export const acceptedResult = (
  flow: "flow1" | "flow2" | "edit",
  message?: string,
): IcHookResult => ({
  flow,
  message: message ?? "Intercompany processing started in background",
  status: "accepted",
});

export const notImplementedResult = (feature: string): IcHookResult =>
  skipResult(`not_implemented:${feature}`);
