import { createApiLogMutations, type ApiLogMutations } from "./api-log.mutations";
import type { IcApiLog, WriteApiLogInput } from "./api-log.types";

export type ApiLogService = {
  write: (input: WriteApiLogInput) => Promise<IcApiLog>;
};

export const createApiLogService = (deps?: { mutations?: ApiLogMutations }): ApiLogService => {
  const mutations = deps?.mutations ?? createApiLogMutations();
  return {
    write: (input) => mutations.insert(input),
  };
};

export const apiLogService = createApiLogService();
