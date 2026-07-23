// Shared flow input shapes (expanded in P5/P6).

export type IcPqDraftHookInput = {
  dbName: string;
  docEntry: number;
  docNum?: number | null;
  cardCode: string;
  lines?: unknown[];
};

export type IcPoHookInput = {
  dbName: string;
  docEntry: number;
  docNum?: number | null;
  cardCode: string;
  lines?: unknown[];
  totals?: unknown;
  currency?: string;
  remarks?: string;
};
