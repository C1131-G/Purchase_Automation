/**
 * Shared create-page toast helpers.
 * Validation stays inline (createError); only transient / API feedback uses toasts.
 */
import { toast } from "@/shared/ui/toast/toast";

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

export type IntercompanyToastResult = {
  created?: boolean;
  skipped?: boolean;
  status?: string;
  targetDb?: string;
  targetDraftEntry?: number;
  errorMessage?: string;
  reason?: string;
};

/** Secondary feedback after PO create; does not replace PO success toast. */
export const notifyIntercompanyResult = (
  result: IntercompanyToastResult | null | undefined,
): void => {
  if (!result) {
    return;
  }

  if (result.created) {
    const target = result.targetDb ? ` in ${result.targetDb}` : "";
    const draft = result.targetDraftEntry != null ? ` (draft #${result.targetDraftEntry})` : "";
    toast.success(`Intercompany AR draft created${target}${draft}`, {
      id: "intercompany-sync",
    });
    return;
  }

  if (result.status === "FAILED") {
    const detail = result.errorMessage?.trim() || "Unknown error";
    toast.error(`PO saved; intercompany failed: ${detail}`, {
      id: "intercompany-sync",
      duration: 6000,
    });
  }
};
