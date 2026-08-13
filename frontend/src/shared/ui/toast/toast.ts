/**
 * App toast API (Sonner + Motion cards).
 * Import from here — not from "sonner" — so visuals and durations stay consistent.
 *
 * Keep this file as `.ts` (no JSX). JSX lives in `toast-item.tsx` so Vite
 * module URLs stay stable as `.../toast.ts` across HMR.
 */
import { createElement, type ReactElement } from "react";
import { toast as sonnerToast, type ExternalToast } from "sonner";

import { AppToastItem, type AppToastTone } from "@/shared/ui/toast/toast-item";

const SUCCESS_MS = 1800;
const INFO_MS = 2200;
const WARNING_MS = 3500;
const ERROR_MS = 5000;

export type ToastOptions = ExternalToast;

const descriptionText = (options?: ToastOptions): string | undefined => {
  const value = options?.description;
  return typeof value === "string" && value.trim() ? value : undefined;
};

const renderToast = (
  id: string | number,
  tone: AppToastTone,
  message: string,
  description: string | undefined,
  durationMs: number | undefined,
): ReactElement => {
  const props: {
    id: string | number;
    tone: AppToastTone;
    title: string;
    description?: string;
    durationMs?: number;
  } = {
    id,
    tone,
    title: message,
  };
  if (description) {
    props.description = description;
  }
  if (typeof durationMs === "number") {
    props.durationMs = durationMs;
  }
  return createElement(AppToastItem, props);
};

const show = (
  tone: AppToastTone,
  message: string,
  duration: number,
  options?: ToastOptions,
): string | number => {
  const { description: _description, duration: optionDuration, ...rest } = options ?? {};
  const durationMs = optionDuration ?? duration;
  const description = descriptionText(options);
  const resolvedDuration = typeof durationMs === "number" ? durationMs : undefined;

  return sonnerToast.custom((id) => renderToast(id, tone, message, description, resolvedDuration), {
    duration: durationMs,
    ...rest,
  });
};

export const toast = {
  success: (message: string, options?: ToastOptions) =>
    show("success", message, SUCCESS_MS, options),

  error: (message: string, options?: ToastOptions) => show("error", message, ERROR_MS, options),

  info: (message: string, options?: ToastOptions) => show("info", message, INFO_MS, options),

  warning: (message: string, options?: ToastOptions) =>
    show("warning", message, WARNING_MS, options),

  loading: (message: string, options?: ToastOptions) =>
    show("loading", message, Number.POSITIVE_INFINITY, options),

  /** Two-line success: title + optional detail. */
  successDetail: (title: string, description?: string, options?: ToastOptions) =>
    show("success", title, SUCCESS_MS, { ...options, ...(description ? { description } : {}) }),

  /** Two-line error: title + optional detail. */
  errorDetail: (title: string, description?: string, options?: ToastOptions) =>
    show("error", title, ERROR_MS, { ...options, ...(description ? { description } : {}) }),

  promise: sonnerToast.promise.bind(sonnerToast),

  dismiss: sonnerToast.dismiss.bind(sonnerToast),
};
