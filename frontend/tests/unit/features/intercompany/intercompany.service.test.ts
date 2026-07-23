import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/api/client", () => ({
  apiClient: vi.fn(),
}));

import { IC_API_PATHS } from "@/features/intercompany/api/intercompany.paths";
import { getIcHealth, intercompanyAPI } from "@/features/intercompany/api/intercompany.service";
import { apiClient } from "@/shared/api/client";

const mockedApiClient = vi.mocked(apiClient);

describe("intercompanyAPI (P8A contracts)", () => {
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

  it("listNotifications calls list path without query by default", async () => {
    mockedApiClient.mockResolvedValueOnce({ data: [], success: true });

    await intercompanyAPI.listNotifications();

    expect(mockedApiClient).toHaveBeenCalledWith(IC_API_PATHS.notifications);
  });

  it("listNotifications appends unreadOnly=true when requested", async () => {
    mockedApiClient.mockResolvedValueOnce({ data: [], success: true });

    await intercompanyAPI.listNotifications({ unreadOnly: true });

    expect(mockedApiClient).toHaveBeenCalledWith(`${IC_API_PATHS.notifications}?unreadOnly=true`);
  });

  it("getUnreadCount targets unread-count path", async () => {
    mockedApiClient.mockResolvedValueOnce({
      data: { count: 0 },
      success: true,
    });

    await intercompanyAPI.getUnreadCount();

    expect(mockedApiClient).toHaveBeenCalledWith(IC_API_PATHS.notificationsUnreadCount);
  });

  it("markNotificationRead PATCHes the read path", async () => {
    mockedApiClient.mockResolvedValueOnce({ data: {}, success: true });

    await intercompanyAPI.markNotificationRead(42);

    expect(mockedApiClient).toHaveBeenCalledWith(IC_API_PATHS.notificationRead(42), {
      method: "PATCH",
    });
  });

  it("markAllNotificationsRead POSTs mark-all-read", async () => {
    mockedApiClient.mockResolvedValueOnce({ data: { marked: 2 }, success: true });

    await intercompanyAPI.markAllNotificationsRead();

    expect(mockedApiClient).toHaveBeenCalledWith(IC_API_PATHS.notificationsMarkAllRead, {
      method: "POST",
    });
  });

  it("listRetries supports optional status CSV", async () => {
    mockedApiClient.mockResolvedValueOnce({ data: [], success: true });

    await intercompanyAPI.listRetries({ status: "WAITING,DEAD" });

    expect(mockedApiClient).toHaveBeenCalledWith(`${IC_API_PATHS.retries}?status=WAITING%2CDEAD`);
  });

  it("runRetry POSTs retries/:id/run", async () => {
    mockedApiClient.mockResolvedValueOnce({
      data: { status: "success", item: {} },
      success: true,
    });

    await intercompanyAPI.runRetry(9);

    expect(mockedApiClient).toHaveBeenCalledWith(IC_API_PATHS.retryRun(9), {
      method: "POST",
    });
  });
});
