/**
 * Shared create-page toast helpers.
 * Validation stays inline (createError); only transient / API feedback uses toasts.
 */
import { toast } from "@/shared/ui/toast/toast";

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
  toast.loading(message, { id: hydrateId(documentKey) });
};

export const dismissDocumentHydrating = (documentKey: string): void => {
  toast.dismiss(hydrateId(documentKey));
};

export const notifyDocumentHydrateError = (documentKey: string, message: string): void => {
  toast.error(message, { id: hydrateId(documentKey) });
};
