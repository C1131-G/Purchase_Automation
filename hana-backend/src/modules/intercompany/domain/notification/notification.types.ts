export type IcNotification = {
  notificationId: number;
  companyId: number;
  documentType: string;
  documentId: string | null;
  title: string;
  message: string | null;
  priority: string;
  isRead: boolean;
  flowStep: string | null;
  createdAt?: string | null;
};

export type CreateNotificationInput = {
  companyId: number;
  documentType: string;
  documentId?: string | null;
  title: string;
  message?: string | null;
  priority?: string;
  flowStep?: string | null;
};
