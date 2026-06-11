import type { DashboardPartnerEntry, DashboardPartnerGroup } from "./dashboard.types";
import { getOpenValue } from "./dashboard.calculations";
import { MODULE_HREFS } from "./dashboard.constants";
import type { ModuleDataset, PartnerAggregate, RawDashboardDocument } from "./dashboard.types";

const aggregatePartners = (docs: RawDashboardDocument[]): DashboardPartnerEntry[] => {
  const entries = new Map<string, PartnerAggregate>();

  for (const doc of docs) {
    const key = doc.cardCode || doc.cardName || `${doc.docNum}`;
    const existing = entries.get(key);
    if (existing) {
      existing.totalValue = Number((existing.totalValue + doc.docTotal).toFixed(2));
      existing.documentCount += 1;
      existing.openValue = Number((existing.openValue + getOpenValue(doc)).toFixed(2));
      continue;
    }

    entries.set(key, {
      code: doc.cardCode || key,
      name: doc.cardName || doc.cardCode || "Unknown partner",
      totalValue: Number(doc.docTotal.toFixed(2)),
      documentCount: 1,
      openValue: Number(getOpenValue(doc).toFixed(2)),
    });
  }

  return Array.from(entries.values())
    .sort((left, right) => right.totalValue - left.totalValue)
    .slice(0, 5)
    .map((entry) => ({
      code: entry.code,
      name: entry.name,
      totalValue: entry.totalValue,
      documentCount: entry.documentCount,
      openValue: entry.openValue,
    }));
};

export const buildPartnerGroup = (module: ModuleDataset, title: string): DashboardPartnerGroup => ({
  key: module.module,
  title,
  module: module.module,
  href: MODULE_HREFS[module.module],
  entries: aggregatePartners(module.current),
});
