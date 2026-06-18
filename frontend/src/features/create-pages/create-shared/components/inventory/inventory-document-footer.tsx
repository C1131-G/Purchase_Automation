import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";

interface InventoryDocumentFooterProps {
  remarks: string;
  journalRemark: string;
  onRemarksChange: (v: string) => void;
  onJournalRemarkChange: (v: string) => void;
  idPrefix?: string;
  journalRemarkPlaceholder?: string;
}

export function InventoryDocumentFooter({
  remarks,
  journalRemark,
  onRemarksChange,
  onJournalRemarkChange,
  idPrefix = "inventory",
  journalRemarkPlaceholder = "Journal Remark",
}: InventoryDocumentFooterProps) {
  return (
    <div className="mt-3 grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <SectionCard title="Remarks">
          <textarea
            id={`${idPrefix}-remarks`}
            className="min-h-[80px] w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
            value={remarks}
            onChange={(e) => onRemarksChange(e.target.value)}
            rows={3}
            placeholder="Enter remarks..."
          />
        </SectionCard>
      </div>
      <div>
        <SectionCard title="Journal Remark">
          <input
            id={`${idPrefix}-journal-remark`}
            type="text"
            className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-3 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
            value={journalRemark}
            onChange={(e) => onJournalRemarkChange(e.target.value)}
            placeholder={journalRemarkPlaceholder}
          />
        </SectionCard>
      </div>
    </div>
  );
}
