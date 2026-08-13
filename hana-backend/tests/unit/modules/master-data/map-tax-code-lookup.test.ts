import { describe, expect, it } from "vitest";

import { mapTaxCodeLookup } from "@/modules/master-data/master-data.customers-tax-uom.queries";

describe("mapTaxCodeLookup", () => {
  it("maps OVTG code, name, rate, and category", () => {
    expect(
      mapTaxCodeLookup({
        Category: "i",
        Code: "IN-18",
        Name: "Input GST 18",
        Rate: 18,
      }),
    ).toEqual({
      Category: "I",
      Code: "IN-18",
      Name: "Input GST 18",
      Rate: 18,
      category: "I",
      code: "IN-18",
      id: "IN-18",
      name: "Input GST 18",
      rate: 18,
    });
  });

  it("defaults missing rate and category", () => {
    expect(mapTaxCodeLookup({ Code: "EXEMPT", Name: "" })).toMatchObject({
      Category: "",
      Rate: 0,
      category: "",
      code: "EXEMPT",
      name: "EXEMPT",
      rate: 0,
    });
  });
});
