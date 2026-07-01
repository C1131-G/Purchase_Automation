// Dashboard period calculation: converts period enum to date boundaries.

import type { DashboardPeriod } from "./dashboard.types";
import { PERIOD_LABELS } from "./dashboard.constants";

export const getDateRange = (
  period: "week" | "month" | "year" | "all" = "month",
): DashboardPeriod => {
  const now = new Date();
  const endDate = now.toISOString().split("T")[0];
  let startDate: string;

  switch (period) {
    case "week": {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString().split("T")[0];
      break;
    }
    case "month": {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      startDate = monthAgo.toISOString().split("T")[0];
      break;
    }
    case "year": {
      const yearAgo = new Date(now);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      startDate = yearAgo.toISOString().split("T")[0];
      break;
    }
    default: {
      startDate = "2000-01-01";
    }
  }

  return { endDate, label: PERIOD_LABELS[period], startDate };
};
