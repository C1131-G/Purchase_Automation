import { createRetryMutations, type RetryMutations } from "./retry.mutations";
import { createRetryQueries, type RetryQueries } from "./retry.queries";
import type { EnqueueRetryInput, IcRetryQueueItem } from "./retry.types";

export type RetryService = {
  enqueue: (input: EnqueueRetryInput) => Promise<IcRetryQueueItem>;
  claimDue: (limit?: number) => Promise<IcRetryQueueItem[]>;
  markSuccess: (retryId: number) => Promise<IcRetryQueueItem | null>;
  markFailedOrDead: (retryId: number, errorMessage: string) => Promise<IcRetryQueueItem | null>;
};

export const createRetryService = (deps?: {
  queries?: RetryQueries;
  mutations?: RetryMutations;
}): RetryService => {
  const queries = deps?.queries ?? createRetryQueries();
  const mutations = deps?.mutations ?? createRetryMutations();

  return {
    claimDue: async (limit = 50) => {
      const due = await queries.findDue(limit);
      const claimed: IcRetryQueueItem[] = [];
      for (const item of due) {
        const row = await mutations.claim(item.retryId);
        if (row && row.status === "PROCESSING") {
          claimed.push(row);
        }
      }
      return claimed;
    },
    enqueue: (input) => mutations.insert(input),
    markFailedOrDead: (retryId, errorMessage) => mutations.markFailedOrDead(retryId, errorMessage),
    markSuccess: (retryId) => mutations.markSuccess(retryId),
  };
};

export const retryService = createRetryService();
