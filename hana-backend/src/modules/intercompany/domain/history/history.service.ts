import { createHistoryMutations, type HistoryMutations } from "./history.mutations";
import type { AppendHistoryInput, IcSyncHistory } from "./history.types";

export type HistoryService = {
  append: (input: AppendHistoryInput) => Promise<IcSyncHistory>;
};

export const createHistoryService = (deps?: { mutations?: HistoryMutations }): HistoryService => {
  const mutations = deps?.mutations ?? createHistoryMutations();
  return {
    append: (input) => mutations.insert(input),
  };
};

export const historyService = createHistoryService();
