import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CreatePageWrapper } from "@/features/create-pages/create-shared/components/layout/create-page-wrapper";
import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";
import { notifyFeatureUnavailable } from "@/features/create-pages/create-shared/utils/create-feedback-toast";

export function ItemMasterCreate() {
  const [itemCode, setItemCode] = useState("");
  const [itemName, setItemName] = useState("");
  const [invntItem, setInvntItem] = useState("Y");
  const [itmsGrpCod, setItmsGrpCod] = useState("");
  const [invntryUom, setInvntryUom] = useState("");
  const [codeBars, setCodeBars] = useState("");

  const handleAdd = () => {
    notifyFeatureUnavailable("Item master create");
  };

  return (
    <CreatePageWrapper
      dashboardUrl="/dashboard/inventory"
      breadcrumbParent={{
        label: "Item Master Data Table",
        to: "/inventory/item-master",
      }}
      pageTitle="Create Item Master"
    >
      <div className="max-w-3xl space-y-4">
        <SectionCard title="Item Details">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Item No.
              </label>
              <input
                type="text"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-3 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value)}
                placeholder="Item Code"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Description
              </label>
              <input
                type="text"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-3 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Item Name"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Stock Item
              </label>
              <select
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                value={invntItem}
                onChange={(e) => setInvntItem(e.target.value)}
              >
                <option value="Y">Yes</option>
                <option value="N">No</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Group
              </label>
              <input
                type="text"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-3 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                value={itmsGrpCod}
                onChange={(e) => setItmsGrpCod(e.target.value)}
                placeholder="Item Group Code"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                UoM
              </label>
              <input
                type="text"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-3 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                value={invntryUom}
                onChange={(e) => setInvntryUom(e.target.value)}
                placeholder="Unit of Measure"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Bar Code
              </label>
              <input
                type="text"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-3 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                value={codeBars}
                onChange={(e) => setCodeBars(e.target.value)}
                placeholder="Bar Code"
              />
            </div>
          </div>
        </SectionCard>

        {/* Buttons */}
        <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-4">
          <button
            type="button"
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700"
            onClick={handleAdd}
          >
            Add
          </button>
          <Link
            to="/inventory/item-master"
            search={{ limit: 10, page: 1 }}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </div>
    </CreatePageWrapper>
  );
}
