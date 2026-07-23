import { createRetryMutations, type RetryMutations } from "./retry.mutations";
import { createRetryQueries, type RetryQueries } from "./retry.queries";
import type { EnqueueRetryInput, IcRetryQueueItem } from "./retry.types";

export type RetryService = {
  enqueue: (input: EnqueueRetryInput) => Promise<IcRetryQueueItem>;
  claimDue: (limit?: number) => Promise<IcRetryQueueItem[]>;
  markSuccess: (retryId: number) => Promise<IcRetryQueueItem | null>;
  markFailedOrDead: (retryId: number, errorMessage: string) => Promise<IcRetryQueueItem | null>;
  listForCompany: (
    companyId: number,
    opts?: { statuses?: string[] },
  ) => Promise<IcRetryQueueItem[]>;
  findById: (retryId: number) => Promise<IcRetryQueueItem | null>;
  forceWaiting: (retryId: number) => Promise<IcRetryQueueItem | null>;
  claim: (retryId: number) => Promise<IcRetryQueueItem | null>;
};

export const createRetryService = (deps?: {
  queries?: RetryQueries;
  mutations?: RetryMutations;
}): RetryService => {
  const queries = deps?.queries ?? createRetryQueries();
  const mutations = deps?.mutations ?? createRetryMutations();

  return {
    claim: (retryId) => mutations.claim(retryId),
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
    findById: (retryId) => queries.findById(retryId),
    forceWaiting: (retryId) => mutations.forceWaiting(retryId),
    listForCompany: (companyId, opts) => queries.listForCompany(companyId, opts),
    markFailedOrDead: (retryId, errorMessage) => mutations.markFailedOrDead(retryId, errorMessage),
    markSuccess: (retryId) => mutations.markSuccess(retryId),
  };
};

export const retryService = createRetryService();
