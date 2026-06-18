import { Search } from "lucide-react";
import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";

interface InventoryDocumentHeaderProps {
  number: string;
  series: string;
  priceList: string;
  postingDate: string;
  documentDate: string;
  ref2: string;
  onNumberChange: (v: string) => void;
  onSeriesChange: (v: string) => void;
  onPriceListChange: (v: string) => void;
  onPostingDateChange: (v: string) => void;
  onDocumentDateChange: (v: string) => void;
  onRef2Change: (v: string) => void;
  idPrefix?: string;
}

export function InventoryDocumentHeader({
  number,
  series,
  priceList,
  postingDate,
  documentDate,
  ref2,
  onNumberChange,
  onSeriesChange,
  onPriceListChange,
  onPostingDateChange,
  onDocumentDateChange,
  onRef2Change,
  idPrefix = "inventory",
}: InventoryDocumentHeaderProps) {
  return (
    <div className="grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
      {/* General Info */}
      <SectionCard title="General Info">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1.5 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Number
            </label>
            <input
              type="text"
              id={`${idPrefix}-number`}
              className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-3 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
              value={number}
              onChange={(e) => onNumberChange(e.target.value)}
              placeholder="Number"
            />
          </div>
          <div>
            <label className="mb-1.5 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Series
            </label>
            <input
              type="text"
              id={`${idPrefix}-series`}
              className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-3 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
              value={series}
              onChange={(e) => onSeriesChange(e.target.value)}
              placeholder="Series"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            Price List
          </label>
          <div className="relative">
            <input
              type="text"
              id={`${idPrefix}-price-list`}
              className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-3 pr-10 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
              value={priceList}
              onChange={(e) => onPriceListChange(e.target.value)}
              placeholder="Select Price List"
            />
            <div className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-100">
              <Search className="h-3 w-3" />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Document Dates */}
      <SectionCard title="Document Dates">
        <div>
          <label className="mb-1.5 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            Posting Date
          </label>
          <input
            type="text"
            id={`${idPrefix}-posting-date`}
            className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-3 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
            value={postingDate}
            onChange={(e) => onPostingDateChange(e.target.value)}
            placeholder="DD/MM/YY"
          />
        </div>
        <div>
          <label className="mb-1.5 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            Document Date
          </label>
          <input
            type="text"
            id={`${idPrefix}-document-date`}
            className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-3 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
            value={documentDate}
            onChange={(e) => onDocumentDateChange(e.target.value)}
            placeholder="DD/MM/YY"
          />
        </div>
      </SectionCard>

      {/* References */}
      <SectionCard title="References">
        <div>
          <label className="mb-1.5 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            Ref. 2
          </label>
          <input
            type="text"
            id={`${idPrefix}-ref2`}
            className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-3 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
            value={ref2}
            onChange={(e) => onRef2Change(e.target.value)}
            placeholder="Reference 2"
          />
        </div>
      </SectionCard>
    </div>
  );
}
