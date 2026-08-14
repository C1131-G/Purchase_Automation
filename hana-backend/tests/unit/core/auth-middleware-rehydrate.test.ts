import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const isSessionValid = vi.fn();
const rehydrateFromPortalSession = vi.fn();

vi.mock("@/services/service-layer.service", () => ({
  serviceLayerClient: {
    isSessionValid,
    rehydrateFromPortalSession,
  },
}));

vi.mock("@/core/logger/pino-logger", () => ({
  bindRequestLogger: vi.fn(),
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

describe("validateSession SAP rehydrate", () => {
  beforeEach(() => {
    vi.resetModules();
    isSessionValid.mockReset();
    rehydrateFromPortalSession.mockReset();
  });

  const run = async () => {
    const { validateSession } = await import("@/core/middleware/auth.middleware");
    const destroy = vi.fn((cb?: () => void) => cb?.());
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const clearCookie = vi.fn();
    const next = vi.fn() as NextFunction;
    const req = {
      path: "/notifications/unread-count",
      session: {
        destroy,
        dbName: "AJAX_POS_DB",
        sapCookie: "B1SESSION=abc",
        sessionId: "sap-1",
        slUsername: "manager",
        user: { dbName: "AJAX_POS_DB", userName: "Ajax User" },
      },
    } as unknown as Request;
    const res = { clearCookie, json, status } as unknown as Response;
    await validateSession(req, res, next);
    return { clearCookie, destroy, json, next, req, status };
  };

  it("rehydrates the SAP cookie instead of logging the user out", async () => {
    isSessionValid.mockReturnValueOnce(false).mockReturnValueOnce(true);
    rehydrateFromPortalSession.mockReturnValue(true);

    const { destroy, next, status } = await run();

    expect(rehydrateFromPortalSession).toHaveBeenCalledWith({
      companyDB: "AJAX_POS_DB",
      cookieString: "B1SESSION=abc",
      sessionId: "sap-1",
      username: "manager",
    });
    expect(destroy).not.toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it("expires the portal session when no SAP cookie can be restored", async () => {
    isSessionValid.mockReturnValue(false);
    rehydrateFromPortalSession.mockReturnValue(false);

    const { clearCookie, destroy, next, status } = await run();

    expect(destroy).toHaveBeenCalledOnce();
    expect(clearCookie).toHaveBeenCalledWith("vendorportal.sid");
    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
