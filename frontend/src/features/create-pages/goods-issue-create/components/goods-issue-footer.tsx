import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";

interface GoodsIssueFooterProps {
  remarks: string;
  journalRemark: string;
  onRemarksChange: (v: string) => void;
  onJournalRemarkChange: (v: string) => void;
}

export function GoodsIssueFooter({
  remarks,
  journalRemark,
  onRemarksChange,
  onJournalRemarkChange,
}: GoodsIssueFooterProps) {
  return (
    <div className="mt-3 grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <SectionCard title="Remarks">
          <textarea
            id="gi-remarks"
            className="w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200 px-4 py-2.5 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 min-h-[80px]"
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
            id="gi-journal-remark"
            type="text"
            className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-800 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200 transition outline-none pl-3 text-sm placeholder:text-zinc-400"
            value={journalRemark}
            onChange={(e) => onJournalRemarkChange(e.target.value)}
            placeholder="Goods Issue"
          />
        </SectionCard>
      </div>
    </div>
  );
}
