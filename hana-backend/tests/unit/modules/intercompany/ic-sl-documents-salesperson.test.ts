import { describe, expect, it } from "vitest";

import { createIcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";

const runPqPatch = async (params: {
  current?: unknown;
  includeCurrent?: boolean;
  fallback?: number | null;
}) => {
  let patchBody: Record<string, unknown> | undefined;
  const documents = createIcSlDocuments({
    resolveSlTarget: {
      resolve: async () => ({ connection: { connectionId: 1, databaseName: "TEST_DB" } }),
    } as never,
    session: { getOrLogin: async () => ({ sessionToken: "test", routeId: null }) } as never,
    client: {
      request: async (request: { method: string; body?: Record<string, unknown> }) => {
        if (request.method === "GET") {
          const data: Record<string, unknown> = {
            DocumentLines: [{ LineNum: 0, Quantity: 1 }],
          };
          if (params.includeCurrent !== false) {
            data.SalesPersonCode = params.current;
          }
          return { status: 200, data };
        }
        patchBody = request.body;
        return { status: 204, data: {} };
      },
    } as never,
    apiLog: { write: async () => undefined } as never,
  });

  await documents.applyPricesToPq({
    companyId: 1,
    draftEntry: 55,
    documentLines: [{ LineNum: 0, Quantity: 2 }],
    salesPersonCode: params.fallback,
  });

  return patchBody;
};

describe("IC PQ salesperson preservation", () => {
  it("preserves the current positive salesperson code", async () => {
    const body = await runPqPatch({ current: 17, fallback: null });

    expect(body).toMatchObject({ SalesPersonCode: 17 });
  });

  it("uses the captured salesperson when the PATCH snapshot omits the field", async () => {
    const body = await runPqPatch({ current: 17, includeCurrent: false, fallback: 17 });

    expect(body).toMatchObject({ SalesPersonCode: 17 });
  });

  it("does not send zero when both salesperson sources are missing", async () => {
    const body = await runPqPatch({ current: undefined, fallback: null });

    expect(body).not.toHaveProperty("SalesPersonCode");
  });

  it("does not introduce a salesperson when the current PQ has no salesperson", async () => {
    const body = await runPqPatch({ current: -1, fallback: 17 });

    expect(body).not.toHaveProperty("SalesPersonCode");
  });
});
