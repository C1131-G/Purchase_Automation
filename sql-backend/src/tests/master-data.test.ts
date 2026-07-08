import { beforeEach, describe, expect, it, vi } from "vitest";
import { getVendors, getCustomers, getProducts } from "@/services/master-data.service";
import { businessPartners } from "@/db/schema/business-partners";
import { businessPartnerAddresses } from "@/db/schema/business-partner-addresses";
import { salesEmployees } from "@/db/schema/sales-employees";
import { items } from "@/db/schema/items";
import { itemWarehouseStock } from "@/db/schema/item-warehouse-stock";
import { itemPrices } from "@/db/schema/item-prices";
import { unitOfMeasurements } from "@/db/schema/unit-of-measurements";
import { taxGroups } from "@/db/schema/tax-groups";
import { getDb } from "@/db/client";
import { purgeCache } from "@/core/utils/cache";

// Mock the getDb module
vi.mock("@/db/client", () => {
  const mockDbInstance = {
    select: vi.fn(),
  };
  return {
    getDb: () => mockDbInstance,
    dbContext: {
      getStore: () => ({ dbName: "test" }),
    },
  };
});

describe("Master Data - Business Partner Lookups", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    purgeCache("master:");
  });

  it("should successfully retrieve and align vendors with linked buyers and default addresses", async () => {
    const db = getDb();

    // Mock select chain
    vi.mocked(db.select).mockImplementation((_selectFields: any) => {
      return {
        from: vi.fn().mockImplementation((table: any) => {
          return {
            where: vi.fn().mockImplementation(() => {
              if (table === businessPartners) {
                return [
                  {
                    code: "V001",
                    name: "Vendor 1",
                    type: "S",
                    currency: "USD",
                    salesEmployeeCode: 3,
                    billToAddress: "Old Bill To",
                    shipToAddress: "Old Ship To",
                    billToDef: "Billing Default",
                    shipToDef: "Shipping Default",
                    frozen: false,
                  },
                ];
              } else if (table === businessPartnerAddresses) {
                return [
                  {
                    cardCode: "V001",
                    addressType: "B",
                    address: "Billing Default",
                    street: "123 Billing St",
                    block: "Block A",
                    city: "Bill City",
                    state: "BS",
                    zipCode: "12345",
                    country: "US",
                  },
                  {
                    cardCode: "V001",
                    addressType: "S",
                    address: "Shipping Default",
                    street: "456 Shipping St",
                    block: "",
                    city: "Ship City",
                    state: "SS",
                    zipCode: "67890",
                    country: "US",
                  },
                ];
              } else if (table === salesEmployees) {
                return [
                  {
                    code: 3,
                    name: "Buyer Employee 1",
                  },
                ];
              }
              return [];
            }),
          };
        }),
      };
    });

    const result = await getVendors();

    expect(result).toHaveLength(1);
    const vendor = result[0];

    // Aligned fields check
    expect(vendor.CardCode).toBe("V001");
    expect(vendor.CardName).toBe("Vendor 1");
    expect(vendor.code).toBe("V001");
    expect(vendor.name).toBe("Vendor 1");
    expect(vendor.id).toBe("V001");

    // Address matching check
    expect(vendor.billToAddress).toBe("123 Billing St, Block A, Bill City, BS, 12345, US");
    expect(vendor.shipToAddress).toBe("456 Shipping St, Ship City, SS, 67890, US");
    expect(vendor.addresses).toHaveLength(2);

    // Sales employee mapping check
    expect(vendor.salesEmployeeCode).toBe(3);
    expect(vendor.SalesEmployeeCode).toBe(3);
    expect(vendor.salesEmployeeName).toBe("Buyer Employee 1");
    expect(vendor.SalesEmployeeName).toBe("Buyer Employee 1");
  });

  it("should fall back to the first valid address of appropriate type if default address is missing", async () => {
    const db = getDb();

    vi.mocked(db.select).mockImplementation((_selectFields: any) => {
      return {
        from: vi.fn().mockImplementation((table: any) => {
          return {
            where: vi.fn().mockImplementation(() => {
              if (table === businessPartners) {
                return [
                  {
                    code: "C001",
                    name: "Customer 1",
                    type: "C",
                    currency: "USD",
                    salesEmployeeCode: 1,
                    billToAddress: "Old Bill To",
                    shipToAddress: "Old Ship To",
                    billToDef: "Non-existent Billing",
                    shipToDef: "Non-existent Shipping",
                    frozen: false,
                  },
                ];
              } else if (table === businessPartnerAddresses) {
                return [
                  {
                    cardCode: "C001",
                    addressType: "B",
                    address: "Billing Secondary",
                    street: "999 Billing Ave",
                    block: "",
                    city: "Bill Town",
                    state: "BT",
                    zipCode: "54321",
                    country: "US",
                  },
                ];
              } else if (table === salesEmployees) {
                return [
                  {
                    code: 1,
                    name: "Sales Employee 1",
                  },
                ];
              }
              return [];
            }),
          };
        }),
      };
    });

    const result = await getCustomers();

    expect(result).toHaveLength(1);
    const customer = result[0];

    // Verify fallback to the first Bill-To address, and ship-to falling back to bill-to because no S address exists
    expect(customer.billToAddress).toBe("999 Billing Ave, Bill Town, BT, 54321, US");
    expect(customer.shipToAddress).toBe("999 Billing Ave, Bill Town, BT, 54321, US");
  });

  describe("getProducts", () => {
    beforeEach(() => {
      purgeCache("master:products:");
    });

    it("should retrieve and align products with default tax codes, resolved UOM fields, and aggregate stock when no warehouse filter is supplied", async () => {
      const db = getDb();

      vi.mocked(db.select).mockImplementation((_selectFields: any) => {
        const chain = (table: any) => {
          const mockWhere = () => {
            let data: any[] = [];
            if (table === items) {
              data = [
                {
                  code: "I001",
                  name: "Item 1",
                  foreignName: "Mat 1",
                  inventoryUom: "Each",
                  barcode: "123456",
                  avgPrice: "100.500000",
                  lastPurchasePrice: "95.000000",
                  defaultWarehouse: "WH-01",
                },
              ];
            } else if (table === itemWarehouseStock) {
              data = [
                { itemCode: "I001", qty: 10 },
                { itemCode: "I001", qty: 15 },
              ];
            } else if (table === itemPrices) {
              data = [{ itemCode: "I001", price: 120.0 }];
            } else if (table === taxGroups) {
              data = [
                { code: "O1", name: "Output Tax 18%", rate: "18.00", inactive: false },
                { code: "I1", name: "Input Tax 18%", rate: "18.00", inactive: false },
              ];
            }
            return Object.assign(Promise.resolve(data), {
              limit: () => Promise.resolve(data),
            });
          };

          return {
            where: mockWhere,
            limit: (_l: number) => ({
              where: mockWhere,
            }),
          };
        };

        return {
          from: (table: any) => {
            if (table === unitOfMeasurements) {
              return [{ code: "Each", entry: 1, name: "Each" }];
            }
            return chain(table);
          },
        };
      });

      const result = await getProducts({ priceList: 1 });

      expect(result).toHaveLength(1);
      const product = result[0];

      // Aligned field assertions
      expect(product.ItemCode).toBe("I001");
      expect(product.ItemName).toBe("Item 1");
      expect(product.OnHand).toBe(25); // Sum of 10 and 15
      expect(product.stock).toBe(25);
      expect(product.Price).toBe(120.0); // from mock price list
      expect(product.AvgPrice).toBe(100.5); // from row avgPrice

      // UOM assertions
      expect(product.UoMCode).toBe("Each");
      expect(product.UoMEntry).toBe(1);
      expect(product.UoMName).toBe("Each");
      expect(product.UomList).toHaveLength(1);
      expect(product.UomList[0]).toEqual({ code: "Each", name: "Each", entry: 1 });

      // Tax assertions
      expect(product.TaxCode).toBe("O1"); // default sales tax
      expect(product.TaxRate).toBe(18.0);
    });

    it("should return warehouse-specific stock and purchase tax codes in a purchase flow", async () => {
      const db = getDb();

      vi.mocked(db.select).mockImplementation((_selectFields: any) => {
        const chain = (table: any) => {
          const mockWhere = () => {
            let data: any[] = [];
            if (table === items) {
              data = [
                {
                  code: "I001",
                  name: "Item 1",
                  foreignName: "Mat 1",
                  inventoryUom: "Each",
                  barcode: "123456",
                  avgPrice: "100.500000",
                  lastPurchasePrice: "95.000000",
                  defaultWarehouse: "WH-01",
                },
              ];
            } else if (table === itemWarehouseStock) {
              data = [{ itemCode: "I001", qty: 10 }];
            } else if (table === itemPrices) {
              data = [];
            } else if (table === taxGroups) {
              data = [
                { code: "O1", name: "Output Tax 18%", rate: "18.00", inactive: false },
                { code: "I1", name: "Input Tax 18%", rate: "18.00", inactive: false },
              ];
            }
            return Object.assign(Promise.resolve(data), {
              limit: () => Promise.resolve(data),
            });
          };

          return {
            where: mockWhere,
            limit: (_l: number) => ({
              where: mockWhere,
            }),
          };
        };

        return {
          from: (table: any) => {
            if (table === unitOfMeasurements) {
              return [{ code: "Each", entry: 1, name: "Each" }];
            }
            return chain(table);
          },
        };
      });

      const result = await getProducts({
        type: "purchase",
        warehouseCode: "WH-01",
      });

      expect(result).toHaveLength(1);
      const product = result[0];

      expect(product.OnHand).toBe(10); // Specific warehouse stock only
      expect(product.TaxCode).toBe("I1"); // default purchase tax
      expect(product.TaxRate).toBe(18.0);
      expect(product.Price).toBe(100.5); // falls back to avgPrice because no priceList filter was provided
    });
  });
});
