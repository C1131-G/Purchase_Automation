import { describe, expect, it } from "vitest";

import { buildSqlListFilters } from "@/core/utils/query-helper.util";

const table = {
  cardCode: "card_code",
  cardName: "card_name",
  comments: "comments",
  docDate: "doc_date",
  docNum: "doc_num",
  docStatus: "doc_status",
  docTotal: "doc_total",
} as never;

describe("buildSqlListFilters", () => {
  it("returns no where clause when filters are empty", () => {
    const result = buildSqlListFilters(table, {}, {});

    expect(result.where).toBeUndefined();
    expect(result.orderBy).toBeDefined();
  });

  it("builds where when cardCode is provided", () => {
    const result = buildSqlListFilters(table, { cardCode: "V001" }, {});

    expect(result.where).toBeDefined();
  });

  it("builds where when date range is provided", () => {
    const result = buildSqlListFilters(table, { dateFrom: "2024-01-01", dateTo: "2024-12-31" }, {});

    expect(result.where).toBeDefined();
  });

  it("builds where when docStatus maps from Open", () => {
    const result = buildSqlListFilters(table, { docStatus: "Open" }, {});

    expect(result.where).toBeDefined();
  });
});
