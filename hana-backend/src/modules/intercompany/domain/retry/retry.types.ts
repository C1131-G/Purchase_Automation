export type IcRetryStatus = "WAITING" | "PROCESSING" | "SUCCESS" | "DEAD";

export type IcRetryQueueItem = {
  retryId: number;
  companyId: number;
  docMappingId: number | null;
  sourceDocument: string;
  targetDocument: string | null;
  actionCode: string;
  payloadJson: string | null;
  errorMessage: string | null;
  retryCount: number;
  maxRetry: number;
  nextRetryAt: string | null;
  status: IcRetryStatus | string;
};

export type EnqueueRetryInput = {
  companyId: number;
  docMappingId?: number | null;
  sourceDocument: string;
  targetDocument?: string | null;
  actionCode: string;
  payloadJson?: string | null;
  errorMessage?: string | null;
  maxRetry?: number;
  nextRetryAt?: string | null;
};
