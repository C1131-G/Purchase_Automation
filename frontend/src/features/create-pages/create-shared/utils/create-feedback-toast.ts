/**
 * Shared create-page toast helpers.
 * Validation stays inline (createError); only transient / API feedback uses toasts.
 */
import { PQ_RFQ_LOCKED_MESSAGE } from "@/features/create-pages/create-shared/utils/pq-rfq-copy";
import { toast } from "@/shared/ui/toast/toast";

export const SQ_EDIT_LOCKED_MESSAGE = "Can't edit";

const errorMessageFromUnknown = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return fallback;
};

/** Edit mode: field is locked — transient notice (deduped). */
export const notifyEditRestrictedField = (fieldName = "Field"): void => {
  toast.info(`${fieldName} cannot be changed in edit mode`, {
    id: "edit-restricted",
  });
};

/** PQ locked after seller RFQ submit. */
export const notifyPqRfqLocked = (): void => {
  toast.info(PQ_RFQ_LOCKED_MESSAGE, { id: "pq-rfq-locked" });
};

/** SQ edit page is fully read-only. */
export const notifySqEditLocked = (): void => {
  toast.info(SQ_EDIT_LOCKED_MESSAGE, { id: "sq-edit-locked" });
};

/** SAP / network failure after mutate — also keep setCreateError for on-page text. */
export const notifyCreateApiError = (message: string, documentKey: string): void => {
  toast.error(message, { id: `create-error-${documentKey}` });
};

/** Generic action success (create/update/export). */
export const notifyActionSuccess = (message: string, id: string): void => {
  toast.success(message, { id });
};

/** Generic action failure. */
export const notifyActionError = (error: unknown, fallback: string, id: string): void => {
  toast.error(errorMessageFromUnknown(error, fallback), { id });
};

/** Mock / not-yet-connected UI actions. */
export const notifyFeatureUnavailable = (featureLabel: string): void => {
  toast.info(`${featureLabel} is not available yet`, {
    id: `unavailable-${featureLabel}`,
  });
};

const hydrateId = (documentKey: string) => `hydrate-${documentKey}`;

export const notifyDocumentHydrating = (
  documentKey: string,
  message = "Loading document…",
): void => {
  toast.loading(message, { duration: 1800, id: hydrateId(documentKey) });
};

export const dismissDocumentHydrating = (documentKey: string): void => {
  toast.dismiss(hydrateId(documentKey));
};

export const notifyDocumentHydrateError = (documentKey: string, message: string): void => {
  toast.error(message, { id: hydrateId(documentKey) });
};
