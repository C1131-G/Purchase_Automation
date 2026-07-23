export type IcSyncHistory = {
  syncId: number;
  companyId: number;
  action: string;
  documentType: string | null;
  documentEntry: string | null;
  status: string;
  durationMs: number | null;
  responseJson: string | null;
};

export type AppendHistoryInput = {
  companyId: number;
  action: string;
  documentType?: string | null;
  documentEntry?: string | null;
  status: string;
  durationMs?: number | null;
  responseJson?: string | null;
};
