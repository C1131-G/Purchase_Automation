export interface HanaConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

export const testHanaConnection = async (_config: HanaConfig): Promise<boolean> => false;

export const executeHanaQuery = async (_query: string, _params?: unknown[]): Promise<unknown> =>
  null;

export const hanaService = { executeHanaQuery, testHanaConnection };
