import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import { dashboardKeys } from "./queryKeys";
import type {
  DashboardArea,
  DashboardPeriod,
  DashboardMetric,
  DashboardModuleCard,
  DashboardTrend,
  DashboardFunnelStep,
  DashboardPartnerGroup,
  DashboardExceptionGroup,
} from "../utils/types";

interface DashboardResponse<T> {
  data: T;
  currency: string;
}

export function useDashboardKpiSummary(area: DashboardArea, period: DashboardPeriod) {
  return useQuery({
    queryKey: dashboardKeys.segment(area, period, "kpi-summary"),
    queryFn: () =>
      apiClient<DashboardResponse<DashboardMetric[]>>(
        `/api/v1/dashboard/${area}/kpi-summary?period=${period}`,
      ),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useDashboardModuleCards(area: DashboardArea, period: DashboardPeriod) {
  return useQuery({
    queryKey: dashboardKeys.segment(area, period, "module-cards"),
    queryFn: () =>
      apiClient<DashboardResponse<DashboardModuleCard[]>>(
        `/api/v1/dashboard/${area}/module-cards?period=${period}`,
      ),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useDashboardTrend(area: DashboardArea, period: DashboardPeriod) {
  return useQuery({
    queryKey: dashboardKeys.segment(area, period, "trend"),
    queryFn: () =>
      apiClient<DashboardResponse<DashboardTrend>>(
        `/api/v1/dashboard/${area}/trend?period=${period}`,
      ),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useDashboardFunnel(area: DashboardArea, period: DashboardPeriod) {
  return useQuery({
    queryKey: dashboardKeys.segment(area, period, "funnel"),
    queryFn: () =>
      apiClient<DashboardResponse<DashboardFunnelStep[]>>(
        `/api/v1/dashboard/${area}/funnel?period=${period}`,
      ),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useDashboardTopPartners(area: DashboardArea, period: DashboardPeriod) {
  return useQuery({
    queryKey: dashboardKeys.segment(area, period, "top-partners"),
    queryFn: () =>
      apiClient<DashboardResponse<DashboardPartnerGroup[]>>(
        `/api/v1/dashboard/${area}/top-partners?period=${period}`,
      ),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useDashboardExceptions(area: DashboardArea, period: DashboardPeriod) {
  return useQuery({
    queryKey: dashboardKeys.segment(area, period, "exceptions"),
    queryFn: () =>
      apiClient<DashboardResponse<DashboardExceptionGroup[]>>(
        `/api/v1/dashboard/${area}/exceptions?period=${period}`,
      ),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
