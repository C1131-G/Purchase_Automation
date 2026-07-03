// Dashboard trend — matching hana exactly.

import type { DashboardTrendPoint } from "./dashboard.types";
import { createBucketKey, createBucketLabel, toDateOnly } from "./dashboard.period";
import type { AreaDataset } from "./dashboard.types";

export const buildTrendBuckets = (dataset: AreaDataset): DashboardTrendPoint[] => {
  const bucketMap = new Map<string, DashboardTrendPoint>();
  const modules = dataset.modules.map((entry) => entry.module);
  for (const moduleDataset of dataset.modules) {
    for (const doc of moduleDataset.current) {
      const bucket = createBucketKey(doc.docDate, dataset.granularity);
      const entry = bucketMap.get(bucket) ?? {
        bucket,
        label: createBucketLabel(bucket, dataset.granularity),
        series: {},
      };
      if (entry.series[moduleDataset.module] === undefined) {
        for (const module of modules) {
          if (entry.series[module] === undefined) entry.series[module] = 0;
        }
      }
      const currentValue = entry.series[moduleDataset.module] ?? 0;
      entry.series[moduleDataset.module] = Number((currentValue + doc.docTotal).toFixed(2));
      bucketMap.set(bucket, entry);
    }
  }
  const entries = Array.from(bucketMap.values()).sort((left, right) =>
    left.bucket.localeCompare(right.bucket),
  );
  if (entries.length > 0) return entries;
  const today = toDateOnly(new Date());
  const bucket = dataset.granularity === "day" ? today : today.slice(0, 7);
  const series: Record<string, number> = {};
  for (const module of modules) series[module] = 0;
  return [{ bucket, label: createBucketLabel(bucket, dataset.granularity), series }];
};

// Legacy exports for backward compat
export const getPurchaseTrend = async (period: "week" | "month" | "year") => [
  { periodLabel: period, value: 0, previousValue: 0, change: 0 },
];
export const getSalesTrend = async (period: "week" | "month" | "year") => [
  { periodLabel: period, value: 0, previousValue: 0, change: 0 },
];
