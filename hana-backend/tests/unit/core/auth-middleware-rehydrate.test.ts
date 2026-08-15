import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const isSessionValid = vi.fn();
const rehydrateFromPortalSession = vi.fn();
const ensureSessionCredentials = vi.fn();
const getSession = vi.fn();

vi.mock("@/services/service-layer.service", () => ({
  serviceLayerClient: {
    isSessionValid,
    rehydrateFromPortalSession,
    ensureSessionCredentials,
    getSession,
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
    ensureSessionCredentials.mockReset();
    getSession.mockReset();
    ensureSessionCredentials.mockResolvedValue(undefined);
    getSession.mockReturnValue(null);
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
    const res = { clearCookie, end: vi.fn(), json, status } as unknown as Response;
    await validateSession(req, res, next);
    return { clearCookie, destroy, json, next, req, res, status };
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
    expect(ensureSessionCredentials).toHaveBeenCalledWith("sap-1");
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

  it("writes a refreshed SAP cookie back onto the Express session before the response ends", async () => {
    isSessionValid.mockReturnValue(true);
    getSession.mockReturnValue({
      cookieString: "B1SESSION=fresh",
      username: "sl-manager",
    });

    const { next, req, res } = await run();
    expect(next).toHaveBeenCalledOnce();
    expect(req.session.sapCookie).toBe("B1SESSION=fresh");
    expect(req.session.slUsername).toBe("sl-manager");

    getSession.mockReturnValue({
      cookieString: "B1SESSION=after-refresh",
      username: "sl-manager",
    });
    (res.end as unknown as () => void)();
    expect(req.session.sapCookie).toBe("B1SESSION=after-refresh");
  });
});
