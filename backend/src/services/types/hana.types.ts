export interface HanaPool {
  getConnection: (callback: (err: Error | null, conn: HanaConnection) => void) => void;
  clear: () => void;
  getPoolSize?: () => number;
  getAvailableCount?: () => number;
}

export interface HanaConnection {
  exec: (
    sql: string,
    params: unknown[],
    callback: (err: Error | null, rows: Record<string, unknown>[]) => void,
  ) => void;
  disconnect: (callback?: () => void) => void;
}
