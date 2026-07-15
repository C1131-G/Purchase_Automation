import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { adminSettings } from "@/db/schema/admin-settings";
import { priceLists } from "@/db/schema/price-lists";
import { salesEmployees } from "@/db/schema/sales-employees";
import { taxGroups } from "@/db/schema/tax-groups";
import { unitOfMeasurements } from "@/db/schema/unit-of-measurements";
import { users } from "@/db/schema/users";
import { warehouses } from "@/db/schema/warehouses";

export async function seedTenantReference(
  db: NodePgDatabase<Record<string, never>>,
  tenant: { dbName: string; prefix: string; seed: number },
  seedCurrency: string,
  seededUsers: any[],
) {
  // Seed admin settings
  await db.insert(adminSettings).values({ code: "MainCurncy", value: seedCurrency });

  // Seed tenant users
  const allowedUsernames: string[] = [];
  if (tenant.dbName === "CIBI_ERP_DB") {
    allowedUsernames.push("Cibi", "Chandru");
  } else if (tenant.dbName === "VISHNU_ERP_DB") {
    allowedUsernames.push("Vishnu");
  } else if (tenant.dbName === "VISHNU_ERP_BRANCH_DB") {
    allowedUsernames.push("Vishnu", "Veera");
  }

  const tenantUsersToInsert = seededUsers
    .filter((u) => allowedUsernames.includes(u.username))
    .map((u) => ({
      companyName: u.companyName,
      id: u.id,
      password: u.password,
      username: u.username,
    }));

  if (tenantUsersToInsert.length > 0) {
    await db.insert(users).values(tenantUsersToInsert);
  }

  // Seed warehouses
  const whValues = [
    {
      code: `${tenant.prefix}WH-01`,
      inactive: false,
      name: "Main Warehouse",
    },
    {
      code: `${tenant.prefix}WH-02`,
      inactive: false,
      name: "Shipping Warehouse",
    },
    {
      code: `${tenant.prefix}WH-03`,
      inactive: false,
      name: "Returns Warehouse",
    },
  ];
  await db.insert(warehouses).values(whValues);

  // Seed UOMs
  const uomValues = [
    { code: "Each", entry: 1, name: "Each" },
    { code: "Box", entry: 2, name: "Box" },
    { code: "Pack", entry: 3, name: "Pack" },
    { code: "Carton", entry: 4, name: "Carton" },
  ];
  await db.insert(unitOfMeasurements).values(uomValues);

  // Seed Price Lists
  const plValues = [
    { listName: "Base Price List", listNum: 1 },
    { listName: "Purchase Price List", listNum: 2 },
  ];
  await db.insert(priceLists).values(plValues);

  // Seed Sales Employees
  const seValues = [
    { active: true, code: 1, name: "Sales Employee 1" },
    { active: true, code: 2, name: "Sales Employee 2" },
    { active: true, code: 3, name: "Buyer Employee 1" },
    { active: true, code: 4, name: "Buyer Employee 2" },
  ];
  await db.insert(salesEmployees).values(seValues);

  // Seed Tax Groups
  const tgValues = [
    { code: "O1", inactive: false, name: "Output Tax 18%", rate: "18.00" },
    { code: "O2", inactive: false, name: "Output Tax 12%", rate: "12.00" },
    { code: "I1", inactive: false, name: "Input Tax 18%", rate: "18.00" },
    { code: "I2", inactive: false, name: "Input Tax 12%", rate: "12.00" },
  ];
  await db.insert(taxGroups).values(tgValues);
}
