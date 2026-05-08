export interface ServiceLayerSession {
  sessionId: string;
  expiresAt: Date;
}

export interface ServiceLayerRequest {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

export interface ServiceLayerResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ServiceLayerEntity {
  __metadata: { uri: string; type: string };
}
