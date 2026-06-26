import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";
import type { CreateLookupOption } from "@/features/create-pages/create-shared/utils/create-order.types";

interface InventoryDocumentHeaderProps {
  number: string;
  series: string;
  priceList: string;
  priceLists?: CreateLookupOption[];
  priceListsLoading?: boolean;
  seriesOptions?: CreateLookupOption[];
  seriesLoading?: boolean;
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
  isEditMode?: boolean;
}

export function InventoryDocumentHeader({
  number,
  series,
  priceList,
  priceLists = [],
  priceListsLoading = false,
  seriesOptions = [],
  seriesLoading = false,
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
  isEditMode = false,
}: InventoryDocumentHeaderProps) {
  return (
    <div className="grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
      {/* General Info */}
      <SectionCard title="General Info">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1.5 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Doc Number
            </label>
            <input
              type="text"
              id={`${idPrefix}-number`}
              className={`h-10 w-full rounded-xl border border-zinc-200 ${series === "Manual" && !isEditMode ? "bg-white" : "bg-zinc-100"} pl-3 text-sm text-zinc-500 outline-none ${series === "Manual" && !isEditMode ? "" : "cursor-not-allowed"}`}
              value={series === "Manual" || isEditMode ? number : ""}
              onChange={(e) => onNumberChange(e.target.value)}
              readOnly={series !== "Manual" || isEditMode}
              disabled={series !== "Manual" || isEditMode}
              placeholder={series === "Manual" || isEditMode ? "" : "(Auto-Generated)"}
            />
          </div>
          <div>
            <label className="mb-1.5 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Series
            </label>
            <select
              id={`${idPrefix}-series`}
              disabled={seriesLoading}
              className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-3 pr-8 text-sm text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:calc(100%-12px)_center] bg-[length:10px_10px] disabled:opacity-60 disabled:cursor-not-allowed"
              value={series}
              onChange={(e) => onSeriesChange(e.target.value)}
            >
              {seriesLoading ? (
                <option value="">Loading...</option>
              ) : seriesOptions.length > 0 ? (
                seriesOptions.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="Primary">Primary</option>
                  <option value="Manual">Manual</option>
                </>
              )}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            Price List
          </label>
          <select
            id={`${idPrefix}-price-list`}
            disabled={priceListsLoading}
            className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-3 pr-8 text-sm text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:calc(100%-12px)_center] bg-[length:10px_10px] disabled:opacity-60 disabled:cursor-not-allowed"
            value={priceList}
            onChange={(e) => onPriceListChange(e.target.value)}
          >
            {priceListsLoading ? (
              <option value="">Loading...</option>
            ) : priceLists.length > 0 ? (
              priceLists.map((pl) => (
                <option key={pl.code} value={pl.name}>
                  {pl.name}
                </option>
              ))
            ) : (
              // Fallback static options when no backend data
              <>
                <option value="Last Purchase Price">Last Purchase Price</option>
                <option value="Base Price">Base Price</option>
                <option value="Regular Purchase Price">Regular Purchase Price</option>
              </>
            )}
          </select>
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
            Doc Date
          </label>
          <input
            type="text"
            id={`${idPrefix}-document-date`}
            className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-3 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
            value={documentDate}
            onChange={(e) => onDocumentDateChange(e.target.value)}
            placeholder="Doc Date"
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
