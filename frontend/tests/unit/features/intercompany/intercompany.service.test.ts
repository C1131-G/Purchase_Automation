import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/api/client", () => ({
  apiClient: vi.fn(),
}));

import { IC_API_PATHS } from "@/features/intercompany/api/intercompany.paths";
import { getIcHealth, intercompanyAPI } from "@/features/intercompany/api/intercompany.service";
import { apiClient } from "@/shared/api/client";

const mockedApiClient = vi.mocked(apiClient);

describe("intercompanyAPI (P4 shell)", () => {
  beforeEach(() => {
    mockedApiClient.mockReset();
  });

  it("getIcHealth calls GET /api/v1/ic/health", async () => {
    const body = {
      data: { module: "intercompany" as const, ok: true as const, phase: "P3" },
      success: true as const,
    };
    mockedApiClient.mockResolvedValueOnce(body);

    const result = await getIcHealth();

    expect(mockedApiClient).toHaveBeenCalledTimes(1);
    expect(mockedApiClient).toHaveBeenCalledWith(IC_API_PATHS.health);
    expect(result).toEqual(body);
  });

  it("getUnreadCount targets the reserved unread-count path (P8)", async () => {
    mockedApiClient.mockResolvedValueOnce({
      data: { count: 0 },
      success: true,
    });

    await intercompanyAPI.getUnreadCount();

    expect(mockedApiClient).toHaveBeenCalledWith(IC_API_PATHS.notificationsUnreadCount);
  });
});
