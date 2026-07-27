import { beforeEach, describe, expect, it, vi } from "vitest";

import { serviceLayerCredentialKey } from "@/services/service-layer.service";

describe("serviceLayerCredentialKey", () => {
  it("normalizes company and username case and trim", () => {
    expect(serviceLayerCredentialKey("  SboDemo  ", "Manager")).toBe("SBODEMO::MANAGER");
    expect(serviceLayerCredentialKey("sbodemo", "manager")).toBe("SBODEMO::MANAGER");
  });
});

describe("Service Layer session reuse (login path)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("reuses an existing in-memory session for the same company+user", async () => {
    vi.doMock("@/services/service-layer-request", () => ({
      executeServiceLayerRequest: vi.fn(),
      loginToSap: vi.fn(async () => ({
        cookieString: "B1SESSION=abc",
        cookies: ["B1SESSION=abc"],
        sapSessionId: "sess-1",
        sessionTimeout: 30,
        version: "10.0",
      })),
      serviceLayerAbsoluteUrl: (base: string | undefined, path: string) => `${base ?? ""}${path}`,
    }));

    const { serviceLayerClient } = await import("@/services/service-layer.service");
    const { loginToSap } = await import("@/services/service-layer-request");

    serviceLayerClient.initialize("https://sap.example.com/b1s/v1", false);

    const first = await serviceLayerClient.login("SBODEMO", "manager", "secret");
    const second = await serviceLayerClient.login("SBODEMO", "manager", "secret");

    expect(first.sessionId).toBe("sess-1");
    expect(second.sessionId).toBe("sess-1");
    expect(loginToSap).toHaveBeenCalledTimes(1);
  });

  it("does not logout SAP while other portal sessions still reference the session", async () => {
    vi.doMock("@/services/service-layer-request", () => ({
      executeServiceLayerRequest: vi.fn(),
      loginToSap: vi.fn(async () => ({
        cookieString: "B1SESSION=abc",
        cookies: ["B1SESSION=abc"],
        sapSessionId: "sess-shared",
        sessionTimeout: 30,
        version: "10.0",
      })),
      serviceLayerAbsoluteUrl: (base: string | undefined, path: string) => `${base ?? ""}${path}`,
    }));

    const { serviceLayerClient } = await import("@/services/service-layer.service");

    serviceLayerClient.initialize("https://sap.example.com/b1s/v1", false);
    const client = (serviceLayerClient as unknown as { client: { post: ReturnType<typeof vi.fn> } })
      .client;
    // axios client is created in initialize; stub post for logout
    if (client) {
      client.post = vi.fn().mockResolvedValue({ status: 204 });
    }

    await serviceLayerClient.login("SBODEMO", "manager", "secret");
    await serviceLayerClient.login("SBODEMO", "manager", "secret");

    await serviceLayerClient.logout("sess-shared");
    expect(serviceLayerClient.isSessionValid("sess-shared")).toBe(true);

    await serviceLayerClient.logout("sess-shared");
    expect(serviceLayerClient.isSessionValid("sess-shared")).toBe(false);
  });
});
