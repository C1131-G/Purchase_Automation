export interface HanaConnection {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface HanaResult {
  success: boolean;
  data?: unknown[];
  error?: string;
}

export type HanaQuery = string;

export interface HanaStatement {
  execute(): Promise<HanaResult>;
  close(): void;
}
