export function GoodsIssueActions() {
  return (
    <div className="mt-4 flex items-center justify-between border-t border-zinc-150 bg-white p-4 rounded-2xl border border-zinc-200">
      {/* Primary actions — left side */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          id="gi-ok"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 cursor-pointer"
        >
          Add
        </button>
        <button
          type="button"
          id="gi-cancel"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 cursor-pointer"
        >
          Cancel
        </button>
      </div>

      {/* Copy actions — right side */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          id="gi-copy-from"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 cursor-pointer"
        >
          Copy From
        </button>
        <button
          type="button"
          id="gi-copy-to"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 cursor-pointer"
        >
          Copy To
        </button>
      </div>
    </div>
  );
}
