import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { authQueries } from "@/features/auth/api/auth.queries";
import { OrganizationsAPI } from "@/features/auth/api/auth.service";
import { finalizeLogoutQueryCache } from "@/features/auth/hooks/logout-query-cache";

describe("logout query-cache transition", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("delivers organizations to the login dropdown observer without a page refresh", async () => {
    const organizations = [{ companyName: "Seller", dbName: "SELLER_DB" }];
    vi.spyOn(OrganizationsAPI, "getAll").mockResolvedValue({ data: organizations } as never);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    queryClient.setQueryData(["purchase-orders", "list"], [{ docEntry: 1 }]);
    queryClient.setQueryData(["auth", "user"], { userId: 10 });
    const observer = new QueryObserver(queryClient, authQueries.organization());
    const observedOrganizations: unknown[] = [];
    const unsubscribe = observer.subscribe((result) => {
      if (result.data) observedOrganizations.push(result.data);
    });

    await finalizeLogoutQueryCache(queryClient);

    expect(observedOrganizations.at(-1)).toEqual(organizations);
    expect(queryClient.getQueryData(["purchase-orders", "list"])).toBeUndefined();
    expect(queryClient.getQueryData(["auth", "user"])).toBeUndefined();
    unsubscribe();
    queryClient.clear();
  });
});
