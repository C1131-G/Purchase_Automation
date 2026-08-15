import { describe, expect, it, vi, beforeEach } from "vitest";

import { logger } from "@/core/logger/pino-logger";
import {
  executeServiceLayerRequest,
  loginToSap,
  serviceLayerAbsoluteUrl,
  type ServiceLayerHost,
} from "@/services/service-layer-request";

vi.mock("@/core/observability/metrics", () => ({
  recordSapSlError: vi.fn(),
  recordSapSlRefresh: vi.fn(),
  recordSapSlRequest: vi.fn(),
}));

vi.mock("@/core/observability/tracing", () => ({
  withSpan: (_name: string, _attrs: unknown, fn: (span: { setAttribute: () => void }) => unknown) =>
    fn({ setAttribute: vi.fn() }),
}));

describe("serviceLayerAbsoluteUrl", () => {
  it("joins baseURL and relative path without double slashes", () => {
    expect(serviceLayerAbsoluteUrl("https://sap.example.com:50000/b1s/v1", "/PurchaseOrders")).toBe(
      "https://sap.example.com:50000/b1s/v1/PurchaseOrders",
    );
  });

  it("strips trailing slashes on baseURL", () => {
    expect(serviceLayerAbsoluteUrl("https://sap.example.com/b1s/v1/", "Orders(1)")).toBe(
      "https://sap.example.com/b1s/v1/Orders(1)",
    );
  });

  it("returns path only when baseURL is missing", () => {
    expect(serviceLayerAbsoluteUrl(undefined, "/Login")).toBe("/Login");
  });

  it("preserves query string on endpoint", () => {
    expect(serviceLayerAbsoluteUrl("https://host/b1s/v1", "/Items?$select=ItemCode")).toBe(
      "https://host/b1s/v1/Items?$select=ItemCode",
    );
  });
});

describe("Service Layer access logging", () => {
  const baseURL = "https://sap.example.com:50000/b1s/v1";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function createHost(clientImpl?: ReturnType<typeof vi.fn>): {
    host: ServiceLayerHost;
    clientFn: ReturnType<typeof vi.fn>;
    postFn: ReturnType<typeof vi.fn>;
  } {
    const postFn = vi.fn();
    const clientFn = clientImpl ?? vi.fn();
    Object.assign(clientFn, {
      defaults: { baseURL },
      post: postFn,
    });

    const host: ServiceLayerHost = {
      client: clientFn as unknown as ServiceLayerHost["client"],
      sessions: new Map(),
      sessionCredentials: new Map(),
      refreshLocks: new Map(),
      destroyLocalSession: vi.fn(),
      request: vi.fn(),
    };
    return { host, clientFn, postFn };
  }

  function seedSession(host: ServiceLayerHost, sessionId = "sess-1") {
    host.sessions.set(sessionId, {
      sessionId,
      companyDB: "SBO",
      username: "manager",
      cookieString: "B1SESSION=abc",
      cookies: ["B1SESSION=abc"],
      lastSapCall: Date.now(),
      loginTime: Date.now(),
    });
  }

  it("logs successful SL request with full URL and target", async () => {
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => logger);
    const { host, clientFn } = createHost(
      vi.fn().mockResolvedValue({
        status: 201,
        data: { DocEntry: 1 },
      }),
    );
    seedSession(host);

    await executeServiceLayerRequest(host, "sess-1", "POST", "/PurchaseOrders", { CardCode: "V1" });

    expect(clientFn).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: "outbound",
        target: "service_layer",
        method: "POST",
        url: `${baseURL}/PurchaseOrders`,
        path: "/PurchaseOrders",
        status: 201,
        endpointGroup: "PurchaseOrders",
      }),
      "SL POST /PurchaseOrders 201",
    );
    // Access log must not include request body / secrets
    const logPayload = infoSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(logPayload).not.toHaveProperty("data");
    expect(logPayload).not.toHaveProperty("password");
    expect(logPayload).not.toHaveProperty("Cookie");
  });

  it("logs failed SL request at warn with status and short error", async () => {
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => logger);
    const axiosError = Object.assign(new Error("Request failed with status code 400"), {
      isAxiosError: true,
      response: {
        status: 400,
        data: { error: { message: { value: "Document already closed" } } },
      },
      toJSON: () => ({}),
    });
    const { default: axios } = await import("axios");
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true);

    const { host } = createHost(vi.fn().mockRejectedValue(axiosError));
    seedSession(host);

    await expect(
      executeServiceLayerRequest(host, "sess-1", "PATCH", "/Orders(42)", {}),
    ).rejects.toThrow("Document already closed");

    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: "outbound",
        target: "service_layer",
        method: "PATCH",
        url: `${baseURL}/Orders(42)`,
        path: "/Orders(42)",
        status: 400,
        endpointGroup: "Orders",
        err: "Document already closed",
      }),
      "SL PATCH /Orders(42) 400",
    );
  });

  it("logs successful login without password fields", async () => {
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => logger);
    const { host, postFn } = createHost();
    postFn.mockResolvedValue({
      status: 200,
      headers: { "set-cookie": ["B1SESSION=login-sess; path=/"] },
      data: { SessionTimeout: 30, Version: "10" },
    });

    await loginToSap(host, "SBODEMO", "manager", "secret-password");

    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: "outbound",
        target: "service_layer",
        method: "POST",
        url: `${baseURL}/Login`,
        path: "/Login",
        status: 200,
        endpointGroup: "Login",
      }),
      "SL POST /Login 200",
    );
    const logPayload = infoSpy.mock.calls.find(
      (call) => typeof call[1] === "string" && call[1].startsWith("SL POST /Login"),
    )?.[0] as Record<string, unknown>;
    expect(logPayload).not.toHaveProperty("password");
    expect(logPayload).not.toHaveProperty("Password");
    expect(JSON.stringify(logPayload)).not.toContain("secret-password");
  });

  it("silently re-logins with company credentials after SAP 401", async () => {
    const axiosError = Object.assign(new Error("Request failed with status code 401"), {
      isAxiosError: true,
      response: {
        status: 401,
        data: { error: { message: { value: "Invalid session" } } },
      },
      toJSON: () => ({}),
    });
    const { default: axios } = await import("axios");
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true);

    const clientFn = vi
      .fn()
      .mockRejectedValueOnce(axiosError)
      .mockResolvedValueOnce({ status: 201, data: { DocEntry: 9 } });
    const { host, postFn } = createHost(clientFn);
    host.request = (sessionId, method, endpoint, data, allowRetry) =>
      executeServiceLayerRequest(host, sessionId, method, endpoint, data, allowRetry);
    host.resolveRefreshCredentials = vi.fn().mockResolvedValue({
      companyDB: "SBO",
      password: "sl-secret",
      username: "manager",
    });
    seedSession(host);
    postFn.mockResolvedValue({
      status: 200,
      headers: { "set-cookie": ["B1SESSION=new-sess; path=/"] },
      data: { SessionTimeout: 30, Version: "10" },
    });

    const result = await executeServiceLayerRequest(
      host,
      "sess-1",
      "POST",
      "/PurchaseDeliveryNotes",
      {
        CardCode: "V1",
      },
    );

    expect(result).toEqual({ DocEntry: 9 });
    expect(host.resolveRefreshCredentials).toHaveBeenCalledWith("sess-1");
    expect(postFn).toHaveBeenCalledWith(
      "/Login",
      expect.objectContaining({
        CompanyDB: "SBO",
        Password: "sl-secret",
        UserName: "manager",
      }),
    );
    expect(host.sessions.get("sess-1")?.cookieString).toBe("B1SESSION=new-sess");
    expect(host.sessionCredentials.get("sess-1")?.password).toBe("sl-secret");
    expect(host.destroyLocalSession).not.toHaveBeenCalled();
  });
});
