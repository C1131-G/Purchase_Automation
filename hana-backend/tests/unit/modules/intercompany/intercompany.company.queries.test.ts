import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Organization } from "@/db/schemas/organization.schema";
import {
  __resetOrganizationRepositoryForTests,
  __setOrganizationRepositoryForTests,
  resolvePoToArInvoiceMapping,
} from "@/modules/intercompany/intercompany.company.queries";

const ajax: Organization = {
  id: "AJAX_POS_DB",
  companyName: "Ajax",
  dbServer: "hana",
  vendorCode: "V0134",
  customerCode: "C0448",
  serviceLayerUsername: "ajax_user",
  serviceLayerPassword: "ajax_pass",
};

const rcm: Organization = {
  id: "RCM_TESTING_POS",
  companyName: "RCM",
  dbServer: "hana",
  vendorCode: "V0011",
  customerCode: "C1105",
  serviceLayerUsername: "rcm_user",
  serviceLayerPassword: "rcm_pass",
};

const findOne = vi.fn();
const find = vi.fn();

const mockRepository = {
  findOne: (...args: unknown[]) => findOne(...args),
  find: (...args: unknown[]) => find(...args),
};

describe("resolvePoToArInvoiceMapping", () => {
  beforeEach(() => {
    findOne.mockReset();
    find.mockReset();
    __resetOrganizationRepositoryForTests();
    __setOrganizationRepositoryForTests(mockRepository as never);
  });

  it("AJAX PO vendor V0134 resolves target RCM and customer C1105", async () => {
    findOne.mockResolvedValue(ajax);
    find.mockResolvedValue([ajax, rcm]);

    const result = await resolvePoToArInvoiceMapping({
      sourceDb: "AJAX_POS_DB",
      sourceVendorCode: "V0134",
    });

    expect(result).toEqual({
      sourceDb: "AJAX_POS_DB",
      sourceVendorCode: "V0134",
      targetDb: "RCM_TESTING_POS",
      targetCustomerCode: "C1105",
      targetServiceLayerUsername: "rcm_user",
      targetServiceLayerPassword: "rcm_pass",
    });
    expect(result?.targetDb).not.toBe("AJAX_POS_DB");
    expect(result?.targetCustomerCode).not.toBe("C0448");
  });

  it("skips when PO vendor is not source VENDOR_CODE", async () => {
    findOne.mockResolvedValue(ajax);
    find.mockResolvedValue([ajax, rcm]);

    const result = await resolvePoToArInvoiceMapping({
      sourceDb: "AJAX_POS_DB",
      sourceVendorCode: "V9999",
    });

    expect(result).toBeNull();
    expect(find).not.toHaveBeenCalled();
  });

  it("RCM PO vendor V0011 resolves target AJAX and customer C0448", async () => {
    findOne.mockResolvedValue(rcm);
    find.mockResolvedValue([ajax, rcm]);

    const result = await resolvePoToArInvoiceMapping({
      sourceDb: "RCM_TESTING_POS",
      sourceVendorCode: "V0011",
    });

    expect(result).toEqual({
      sourceDb: "RCM_TESTING_POS",
      sourceVendorCode: "V0011",
      targetDb: "AJAX_POS_DB",
      targetCustomerCode: "C0448",
      targetServiceLayerUsername: "ajax_user",
      targetServiceLayerPassword: "ajax_pass",
    });
    expect(result?.targetDb).not.toBe("RCM_TESTING_POS");
  });

  it("does not resolve target to source DB when source vendor matches PO", async () => {
    findOne.mockResolvedValue(ajax);
    find.mockResolvedValue([ajax, rcm]);

    const result = await resolvePoToArInvoiceMapping({
      sourceDb: "AJAX_POS_DB",
      sourceVendorCode: "V0134",
    });

    expect(result).not.toBeNull();
    expect(result?.targetDb).toBe("RCM_TESTING_POS");
    expect(result?.targetCustomerCode).toBe("C1105");
  });
});
