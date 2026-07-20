/**
 * App toast API (Sonner).
 * Import from here — not from "sonner" — so durations and defaults stay consistent.
 */
import { toast as sonnerToast, type ExternalToast } from "sonner";

const SUCCESS_MS = 2500;
const INFO_MS = 3000;
const ERROR_MS = 5500;

export type ToastOptions = ExternalToast;

export const toast = {
  success: (message: string, options?: ToastOptions) =>
    sonnerToast.success(message, { duration: SUCCESS_MS, ...options }),

  error: (message: string, options?: ToastOptions) =>
    sonnerToast.error(message, { duration: ERROR_MS, ...options }),

  info: (message: string, options?: ToastOptions) =>
    sonnerToast.message(message, { duration: INFO_MS, ...options }),

  loading: (message: string, options?: ToastOptions) =>
    sonnerToast.loading(message, { duration: Number.POSITIVE_INFINITY, ...options }),

  promise: sonnerToast.promise.bind(sonnerToast),

  dismiss: sonnerToast.dismiss.bind(sonnerToast),
};
