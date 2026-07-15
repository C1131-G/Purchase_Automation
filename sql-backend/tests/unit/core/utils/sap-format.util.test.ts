import { describe, expect, it } from "vitest";

import { toPascalCase, toPascalCaseDocnums, toPascalCaseList } from "@/core/utils/sap-format.util";

describe("toPascalCase", () => {
  it("converts camelCase keys to PascalCase", () => {
    const result = toPascalCase({ cardCode: "V001", docNum: 100 });

    expect(result.CardCode).toBe("V001");
    expect(result.DocNum).toBe(100);
  });
});

describe("toPascalCaseList", () => {
  it("maps rows and preserves pagination defaults", () => {
    const result = toPascalCaseList({
      data: [{ cardCode: "V001" }],
    });

    expect(result.data[0]?.CardCode).toBe("V001");
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.total).toBe(0);
  });
});

describe("toPascalCaseDocnums", () => {
  it("returns empty array for non-array input", () => {
    expect(toPascalCaseDocnums(null as unknown as unknown[])).toEqual([]);
  });
});
