import { faker } from "@faker-js/faker";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { businessPartnerAddresses } from "@/db/schema/business-partner-addresses";
import { businessPartners } from "@/db/schema/business-partners";

export async function seedTenantPartners(
  db: NodePgDatabase<Record<string, never>>,
  tenant: { prefix: string },
) {
  const bpValues: any[] = [];
  const addressValues: any[] = [];

  // 10 Vendors
  for (let i = 1; i <= 10; i += 1) {
    const code = `${tenant.prefix}V-${String(i).padStart(3, "0")}`;
    const name = `${faker.company.name()} Vendor`;
    const billToDef = "Billing Default";
    const shipToDef = "Shipping Default";

    const billToAddrText1 = faker.location.streetAddress(true);
    const billToAddrText2 = faker.location.streetAddress(true);
    const shipToAddrText1 = faker.location.streetAddress(true);
    const shipToAddrText2 = faker.location.streetAddress(true);

    bpValues.push({
      billToAddress: billToAddrText1,
      billToDef,
      code,
      currency: "USD",
      email: faker.internet.email(),
      frozen: false,
      name,
      phone: faker.phone.number(),
      salesEmployeeCode: i % 2 === 0 ? 3 : 4,
      shipToAddress: shipToAddrText1,
      shipToDef,
      type: "S",
    });

    addressValues.push(
      {
        address: "Billing Default",
        addressType: "B",
        cardCode: code,
        city: faker.location.city(),
        country: faker.location.countryCode(),
        state: faker.location.state(),
        street: billToAddrText1,
        zipCode: faker.location.zipCode(),
      },
      {
        address: "Billing Secondary",
        addressType: "B",
        cardCode: code,
        city: faker.location.city(),
        country: faker.location.countryCode(),
        state: faker.location.state(),
        street: billToAddrText2,
        zipCode: faker.location.zipCode(),
      },
      {
        address: "Shipping Default",
        addressType: "S",
        cardCode: code,
        city: faker.location.city(),
        country: faker.location.countryCode(),
        state: faker.location.state(),
        street: shipToAddrText1,
        zipCode: faker.location.zipCode(),
      },
      {
        address: "Shipping Secondary",
        addressType: "S",
        cardCode: code,
        city: faker.location.city(),
        country: faker.location.countryCode(),
        state: faker.location.state(),
        street: shipToAddrText2,
        zipCode: faker.location.zipCode(),
      },
    );
  }

  // 10 Customers
  for (let i = 1; i <= 10; i += 1) {
    const code = `${tenant.prefix}C-${String(i).padStart(3, "0")}`;
    const name = `${faker.company.name()} Customer`;
    const billToDef = "Billing Default";
    const shipToDef = "Shipping Default";

    const billToAddrText1 = faker.location.streetAddress(true);
    const billToAddrText2 = faker.location.streetAddress(true);
    const shipToAddrText1 = faker.location.streetAddress(true);
    const shipToAddrText2 = faker.location.streetAddress(true);

    bpValues.push({
      billToAddress: billToAddrText1,
      billToDef,
      code,
      currency: "USD",
      email: faker.internet.email(),
      frozen: false,
      name,
      phone: faker.phone.number(),
      salesEmployeeCode: i % 2 === 0 ? 1 : 2,
      shipToAddress: shipToAddrText1,
      shipToDef,
      type: "C",
    });

    addressValues.push(
      {
        address: "Billing Default",
        addressType: "B",
        cardCode: code,
        city: faker.location.city(),
        country: faker.location.countryCode(),
        state: faker.location.state(),
        street: billToAddrText1,
        zipCode: faker.location.zipCode(),
      },
      {
        address: "Billing Secondary",
        addressType: "B",
        cardCode: code,
        city: faker.location.city(),
        country: faker.location.countryCode(),
        state: faker.location.state(),
        street: billToAddrText2,
        zipCode: faker.location.zipCode(),
      },
      {
        address: "Shipping Default",
        addressType: "S",
        cardCode: code,
        city: faker.location.city(),
        country: faker.location.countryCode(),
        state: faker.location.state(),
        street: shipToAddrText1,
        zipCode: faker.location.zipCode(),
      },
      {
        address: "Shipping Secondary",
        addressType: "S",
        cardCode: code,
        city: faker.location.city(),
        country: faker.location.countryCode(),
        state: faker.location.state(),
        street: shipToAddrText2,
        zipCode: faker.location.zipCode(),
      },
    );
  }

  await db.insert(businessPartners).values(bpValues);
  if (addressValues.length > 0) {
    await db.insert(businessPartnerAddresses).values(addressValues);
  }

  return {
    bpCustomers: bpValues.filter((bp) => bp.type === "C"),
    bpVendors: bpValues.filter((bp) => bp.type === "S"),
  };
}
