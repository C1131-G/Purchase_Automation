import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import {
  ensureCreateMasterData,
  prefetchCreateMasterData,
} from "@/features/create-pages/create-shared/utils/ensure-create-master-data";

describe("ensureCreateMasterData", () => {
  it("ensures vendors + warehouses + salesEmployees in parallel", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const ensureQueryData = vi.spyOn(queryClient, "ensureQueryData").mockResolvedValue([] as never);

    await ensureCreateMasterData(queryClient, "vendors");

    expect(ensureQueryData).toHaveBeenCalledTimes(4);
    const keys = ensureQueryData.mock.calls.map(
      (call) => (call[0] as { queryKey: unknown[] }).queryKey,
    );
    expect(keys.some((key) => key.includes("vendors-ic-v1"))).toBe(true);
    expect(keys.some((key) => key.includes("warehouses"))).toBe(true);
    expect(keys.some((key) => key.includes("sales-employees"))).toBe(true);
    expect(keys.some((key) => key.includes("tax-codes"))).toBe(true);
  });

  it("uses customers query key for sales create", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const ensureQueryData = vi.spyOn(queryClient, "ensureQueryData").mockResolvedValue([] as never);

    await ensureCreateMasterData(queryClient, "customers");

    const keys = ensureQueryData.mock.calls.map(
      (call) => (call[0] as { queryKey: unknown[] }).queryKey,
    );
    expect(keys.some((key) => key.includes("customers-ic-v1"))).toBe(true);
    expect(keys.some((key) => key.includes("vendors-ic-v1"))).toBe(false);
  });
});

describe("prefetchCreateMasterData", () => {
  it("fires three prefetchQuery calls without awaiting", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const prefetchQuery = vi.spyOn(queryClient, "prefetchQuery").mockResolvedValue(undefined);

    prefetchCreateMasterData(queryClient, "vendors");

    expect(prefetchQuery).toHaveBeenCalledTimes(4);
  });
});
