import { AlertCircle, AlertTriangle, Check, Info, Loader2, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { Transition } from "motion/react";
import { toast as sonnerToast } from "sonner";

import { cn } from "@/shared/utils/cn";

export type AppToastTone = "success" | "error" | "info" | "warning" | "loading";

export type AppToastItemProps = {
  id: string | number;
  tone: AppToastTone;
  title: string;
  description?: string;
  /** Auto-dismiss duration in ms; omit / Infinity for loading (no progress bar). */
  durationMs?: number;
};

const TONE_PLATE: Record<
  AppToastTone,
  { plate: string; glow: string; Icon: typeof Check; spin?: boolean }
> = {
  success: {
    plate: "bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 ring-emerald-100/80",
    glow: "bg-emerald-500/10",
    Icon: Check,
  },
  error: {
    plate: "bg-gradient-to-br from-red-50 to-orange-50 text-red-500 ring-red-100/70",
    glow: "bg-red-500/10",
    Icon: AlertCircle,
  },
  info: {
    plate: "bg-gradient-to-br from-sky-50 to-blue-50 text-sky-600 ring-sky-100/80",
    glow: "bg-sky-500/10",
    Icon: Info,
  },
  warning: {
    plate: "bg-gradient-to-br from-amber-50 to-orange-50 text-amber-600 ring-amber-100/80",
    glow: "bg-amber-500/10",
    Icon: AlertTriangle,
  },
  loading: {
    plate: "bg-gradient-to-br from-zinc-50 to-zinc-100 text-zinc-500 ring-zinc-200/80",
    glow: "bg-zinc-400/10",
    Icon: Loader2,
    spin: true,
  },
};

const TONE_SURFACE: Record<AppToastTone, string> = {
  success: "border-emerald-100/90",
  error: "border-red-100/90 bg-red-50/35",
  warning: "border-amber-100/90 bg-amber-50/30",
  info: "border-sky-100/90",
  loading: "border-zinc-200/90",
};

const TONE_PROGRESS: Record<AppToastTone, string> = {
  success: "bg-emerald-500/70",
  error: "bg-red-500/70",
  warning: "bg-amber-500/70",
  info: "bg-sky-500/70",
  loading: "bg-zinc-400/50",
};

/** Snappy spring — occasional toast, not 100×/day chrome. */
const ENTER_SPRING: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 30,
  mass: 0.85,
};

const ICON_SPRING: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 22,
  mass: 0.7,
  delay: 0.05,
};

/**
 * Motion-powered toast card for Sonner `toast.custom`.
 * Enter from the right + scale (or fade-only when reduced motion).
 */
export function AppToastItem({ id, tone, title, description, durationMs }: AppToastItemProps) {
  const reduceMotion = useReducedMotion();
  const { plate, glow, Icon, spin } = TONE_PLATE[tone];
  const showProgress =
    tone !== "loading" &&
    typeof durationMs === "number" &&
    Number.isFinite(durationMs) &&
    durationMs > 0;

  return (
    <motion.div
      initial={
        reduceMotion ? { opacity: 0 } : { opacity: 0, x: 28, scale: 0.96, filter: "blur(4px)" }
      }
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 16, scale: 0.98, filter: "blur(2px)" }}
      transition={
        reduceMotion
          ? { duration: 0.12, ease: "easeOut" }
          : { ...ENTER_SPRING, filter: { duration: 0.22, ease: "easeOut" } }
      }
      className={cn(
        "pointer-events-auto relative flex w-[min(100vw-1.5rem,22.5rem)] items-start gap-3 overflow-hidden",
        "rounded-2xl border bg-white/95 p-3.5 pr-10 backdrop-blur-md",
        "shadow-[0_12px_40px_-12px_rgba(24,24,27,0.22),0_2px_8px_rgba(24,24,27,0.06)]",
        "ring-1 ring-zinc-900/[0.04] font-outfit",
        TONE_SURFACE[tone],
      )}
    >
      <motion.span
        initial={reduceMotion ? false : { scale: 0.55, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={reduceMotion ? { duration: 0 } : ICON_SPRING}
        className={cn(
          "relative flex size-8 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1",
          plate,
        )}
      >
        <span className={cn("absolute inset-0 rounded-xl blur-lg", glow)} aria-hidden />
        <Icon
          className={cn(
            "relative size-4",
            tone === "success" ? "stroke-[2.25]" : "stroke-[1.75]",
            spin && "animate-spin",
          )}
          aria-hidden
        />
      </motion.span>

      <div className="min-w-0 flex-1 pt-0.5">
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { delay: 0.06, duration: 0.2, ease: [0.23, 1, 0.32, 1] }
          }
          className="text-[13px] font-semibold leading-snug tracking-tight text-zinc-900"
        >
          {title}
        </motion.p>
        {description ? (
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { delay: 0.1, duration: 0.22, ease: [0.23, 1, 0.32, 1] }
            }
            className="mt-0.5 text-xs leading-relaxed text-zinc-500"
          >
            {description}
          </motion.p>
        ) : null}
      </div>

      <motion.button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => {
          sonnerToast.dismiss(id);
        }}
        {...(reduceMotion ? {} : { whileTap: { scale: 0.92 } })}
        transition={{ duration: 0.12, ease: "easeOut" }}
        className={cn(
          "absolute right-2.5 top-2.5 flex size-6 items-center justify-center rounded-lg",
          "border border-zinc-200/90 bg-white text-zinc-400 shadow-sm",
          "transition-colors duration-150 ease-out",
          "hover:bg-zinc-50 hover:text-zinc-700",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10",
        )}
      >
        <X className="size-3.5 stroke-[2]" aria-hidden />
      </motion.button>

      {showProgress ? (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-zinc-100/80">
          <motion.span
            className={cn("block h-full origin-left rounded-full", TONE_PROGRESS[tone])}
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: durationMs / 1000, ease: "linear" }
            }
          />
        </span>
      ) : null}
    </motion.div>
  );
}
