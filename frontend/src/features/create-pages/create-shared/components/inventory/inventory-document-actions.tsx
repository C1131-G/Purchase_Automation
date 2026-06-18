interface InventoryDocumentActionsProps {
  idPrefix?: string;
}

export function InventoryDocumentActions({
  idPrefix = "inventory",
}: InventoryDocumentActionsProps) {
  return (
    <div className="mt-4 flex items-center justify-between rounded-2xl border border-zinc-200 border-t-zinc-150 bg-white p-4">
      {/* Primary actions — left side */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          id={`${idPrefix}-ok`}
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700"
        >
          Add
        </button>
        <button
          type="button"
          id={`${idPrefix}-cancel`}
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>

      {/* Copy actions — right side */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          id={`${idPrefix}-copy-from`}
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
        >
          Copy From
        </button>
        <button
          type="button"
          id={`${idPrefix}-copy-to`}
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
        >
          Copy To
        </button>
      </div>
    </div>
  );
}
