import { createNotificationMutations, type NotificationMutations } from "./notification.mutations";
import { createNotificationQueries, type NotificationQueries } from "./notification.queries";
import type { CreateNotificationInput, IcNotification } from "./notification.types";

export type NotificationService = {
  create: (input: CreateNotificationInput) => Promise<IcNotification>;
  listForCompany: (companyId: number, opts?: { unreadOnly?: boolean }) => Promise<IcNotification[]>;
  countUnreadForCompany: (companyId: number) => Promise<number>;
  markRead: (notificationId: number, companyId: number) => Promise<IcNotification | null>;
  markAllReadForCompany: (companyId: number) => Promise<number>;
};

export const createNotificationService = (deps?: {
  queries?: NotificationQueries;
  mutations?: NotificationMutations;
}): NotificationService => {
  const queries = deps?.queries ?? createNotificationQueries();
  const mutations = deps?.mutations ?? createNotificationMutations();

  return {
    countUnreadForCompany: (companyId) => queries.countUnreadForCompany(companyId),
    create: (input) => mutations.insert(input),
    listForCompany: (companyId, opts) => queries.listForCompany(companyId, opts),
    markAllReadForCompany: (companyId) => mutations.markAllReadForCompany(companyId),
    markRead: (notificationId, companyId) => mutations.markRead(notificationId, companyId),
  };
};

export const notificationService = createNotificationService();
