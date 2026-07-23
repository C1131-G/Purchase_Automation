// Shared IC hook / orchestrator result — never throws into PO/PQ create paths.

export type IcHookResult =
  | { status: "skipped"; reason: string }
  | {
      status: "success";
      mappingId?: number;
      targetDoc?: { type: string; entry: number; num?: number };
    }
  | { status: "queued_retry"; retryId: number }
  | { status: "failed"; message: string; historyId?: number };

export const skipResult = (reason: string): IcHookResult => ({
  reason,
  status: "skipped",
});

export const notImplementedResult = (feature: string): IcHookResult =>
  skipResult(`not_implemented:${feature}`);
