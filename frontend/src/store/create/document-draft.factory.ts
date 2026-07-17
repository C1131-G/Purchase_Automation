import { createAppStore } from "@/store/lib/create-store";
import { applyUpdater, type Updater } from "@/store/lib/updater";

// ---------------------------------------------------------------------------
// Date helpers (shared by create-document drafts)
// ---------------------------------------------------------------------------

export const getTodayISO = (): string => new Date().toISOString().slice(0, 10);

export const toISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** docDate + 1 month + 2 days (standard B1-style offset used across create pages). */
export const getAutoDocDueDate = (docDate: string): string => {
  if (!docDate) {
    return "";
  }
  const base = new Date(`${docDate}T00:00:00`);
  if (Number.isNaN(base.getTime())) {
    return "";
  }
  base.setMonth(base.getMonth() + 1);
  base.setDate(base.getDate() + 2);
  return toISODate(base);
};

export type DueDateStrategy = "offsetMonthPlus2" | "sameAsDocDate" | "none";

function resolveAutoDueDate(docDate: string, strategy: DueDateStrategy): string {
  if (strategy === "none") {
    return "";
  }
  if (strategy === "sameAsDocDate") {
    return docDate;
  }
  return getAutoDocDueDate(docDate);
}

function shouldAutoFillDueDate(
  patch: { docDate?: unknown; docDueDate?: unknown },
  strategy: DueDateStrategy,
): boolean {
  if (strategy === "none" || patch.docDate === undefined) {
    return false;
  }
  const due = patch.docDueDate;
  if (due === undefined || due === null) {
    return true;
  }
  return typeof due === "string" && due.trim() === "";
}

// ---------------------------------------------------------------------------
// Header-only draft (pattern A: lines owned by React state in hooks)
// ---------------------------------------------------------------------------

export interface HeaderOnlyDraftState<THeader extends { docDate: string; docDueDate: string }> {
  header: THeader;
  setHeader: (patch: Partial<THeader>) => void;
  reset: () => void;
}

export interface HeaderOnlyDraftOptions<THeader extends { docDate: string; docDueDate: string }> {
  name: string;
  getDefaultHeader: () => THeader;
  dueDateStrategy?: DueDateStrategy;
}

/**
 * Factory for pattern-A document drafts: header in Zustand, lines stay in React state.
 * Does not expose lines/addLine APIs (those would be dead surface).
 */
export function createHeaderOnlyDraftStore<THeader extends { docDate: string; docDueDate: string }>(
  options: HeaderOnlyDraftOptions<THeader>,
) {
  const dueDateStrategy = options.dueDateStrategy ?? "offsetMonthPlus2";

  return createAppStore<HeaderOnlyDraftState<THeader>>({ name: options.name }, (set) => ({
    header: options.getDefaultHeader(),
    setHeader: (patch) =>
      set(
        (prev) => {
          const nextHeader = { ...prev.header, ...patch };
          if (shouldAutoFillDueDate(patch, dueDateStrategy)) {
            nextHeader.docDueDate = resolveAutoDueDate(
              String(patch.docDate),
              dueDateStrategy,
            ) as THeader["docDueDate"];
          }
          return { header: nextHeader };
        },
        false,
        `${options.name}/setHeader`,
      ),
    reset: () =>
      set(
        {
          header: options.getDefaultHeader(),
        },
        false,
        `${options.name}/reset`,
      ),
  }));
}

// ---------------------------------------------------------------------------
// Full draft with lines (pattern B: header + lines in Zustand)
// ---------------------------------------------------------------------------

export interface LineDraftState<
  THeader extends { docDate: string; docDueDate: string },
  TLine extends { id: string },
> {
  header: THeader;
  lines: TLine[];
  setHeader: (patch: Partial<THeader>) => void;
  setLines: (lines: Updater<TLine[]>) => void;
  addLine: (line: TLine) => void;
  updateLine: (id: string, patch: Partial<TLine>) => void;
  removeLine: (id: string) => void;
  reset: () => void;
}

export interface LineDraftOptions<
  THeader extends { docDate: string; docDueDate: string },
  _TLine extends { id: string } = { id: string },
> {
  name: string;
  getDefaultHeader: () => THeader;
  dueDateStrategy?: DueDateStrategy;
}

/**
 * Factory for pattern-B document drafts: header + lines live in Zustand.
 */
export function createLineDraftStore<
  THeader extends { docDate: string; docDueDate: string },
  TLine extends { id: string },
>(options: LineDraftOptions<THeader, TLine>) {
  const dueDateStrategy = options.dueDateStrategy ?? "offsetMonthPlus2";

  return createAppStore<LineDraftState<THeader, TLine>>({ name: options.name }, (set) => ({
    header: options.getDefaultHeader(),
    lines: [],
    setHeader: (patch) =>
      set(
        (prev) => {
          const nextHeader = { ...prev.header, ...patch };
          if (shouldAutoFillDueDate(patch, dueDateStrategy)) {
            nextHeader.docDueDate = resolveAutoDueDate(
              String(patch.docDate),
              dueDateStrategy,
            ) as THeader["docDueDate"];
          }
          return { header: nextHeader };
        },
        false,
        `${options.name}/setHeader`,
      ),
    setLines: (lines) =>
      set(
        (prev) => ({
          lines: applyUpdater(prev.lines, lines),
        }),
        false,
        `${options.name}/setLines`,
      ),
    addLine: (line) =>
      set(
        (prev) => ({
          lines: [...prev.lines, line],
        }),
        false,
        `${options.name}/addLine`,
      ),
    updateLine: (id, patch) =>
      set(
        (prev) => ({
          lines: prev.lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
        }),
        false,
        `${options.name}/updateLine`,
      ),
    removeLine: (id) =>
      set(
        (prev) => ({
          lines: prev.lines.filter((line) => line.id !== id),
        }),
        false,
        `${options.name}/removeLine`,
      ),
    reset: () =>
      set(
        {
          header: options.getDefaultHeader(),
          lines: [],
        },
        false,
        `${options.name}/reset`,
      ),
  }));
}
