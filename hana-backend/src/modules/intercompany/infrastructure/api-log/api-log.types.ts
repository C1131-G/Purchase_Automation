export type IcApiLog = {
  logId: number;
  companyId: number | null;
  method: string;
  endpoint: string;
  requestJson: string | null;
  responseJson: string | null;
  statusCode: number | null;
};

export type WriteApiLogInput = {
  companyId?: number | null;
  method: string;
  endpoint: string;
  requestJson?: string | null;
  responseJson?: string | null;
  statusCode?: number | null;
};
