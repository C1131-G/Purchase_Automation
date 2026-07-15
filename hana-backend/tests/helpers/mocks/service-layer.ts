import { vi } from "vitest";

/** Shared Service Layer mock used by HANA unit + integration tests. */
export const serviceLayerMock = {
  isSessionValid: vi.fn(() => true),
  login: vi.fn(async () => ({ sessionId: "test-sl-session" })),
  logout: vi.fn(async () => undefined),
  getSession: vi.fn(() => ({
    sessionId: "test-sl-session",
    companyDB: "TEST_COMPANY",
  })),
  request: vi.fn(async () => ({ DocEntry: 1, DocNum: 1001, DocumentLines: [] })),
};

export function resetServiceLayerMock() {
  serviceLayerMock.isSessionValid.mockReset().mockReturnValue(true);
  serviceLayerMock.login.mockReset().mockResolvedValue({ sessionId: "test-sl-session" });
  serviceLayerMock.logout.mockReset().mockResolvedValue(undefined);
  serviceLayerMock.getSession.mockReset().mockReturnValue({
    sessionId: "test-sl-session",
    companyDB: "TEST_COMPANY",
  });
  serviceLayerMock.request
    .mockReset()
    .mockResolvedValue({ DocEntry: 1, DocNum: 1001, DocumentLines: [] });
}
