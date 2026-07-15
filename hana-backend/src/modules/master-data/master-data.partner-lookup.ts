import { In } from "typeorm";

import { getTenantRepository } from "@/db/tenant-query";
import { BusinessPartnerAddressSchema } from "@/db/schemas/business-partner-address.schema";
import type { BusinessPartnerAddress } from "@/db/schemas/business-partner-address.schema";
import { SalesEmployeeSchema } from "@/db/schemas/sales-employee.schema";

import { toTrimmed, toNumberOrZero } from "./master-data.lookup-cache";

export const formatAddress = (row: BusinessPartnerAddress): string => {
  const parts = [
    toTrimmed(row.Street),
    toTrimmed(row.Block),
    toTrimmed(row.City),
    toTrimmed(row.State),
    toTrimmed(row.ZipCode),
    toTrimmed(row.Country),
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(", ");
  }
  return toTrimmed(row.Address);
};

export const fetchBusinessPartnerAddresses = async (
  dbName: string,
  partnerCodes: string[],
  defaultsMap?: Map<string, { billToDef?: string; shipToDef?: string }>,
) => {
  if (partnerCodes.length === 0) {
    return new Map<
      string,
      {
        billToAddress?: string;
        shipToAddress?: string;
        addresses: {
          addressName: string;
          addressType: "B" | "S";
          addressText: string;
        }[];
      }
    >();
  }

  const repository = await getTenantRepository(dbName, BusinessPartnerAddressSchema);
  const rows = await repository.find({
    order: { CardCode: "ASC" } as Record<string, "ASC" | "DESC">,
    select: [
      "CardCode",
      "AdresType",
      "Address",
      "Street",
      "Block",
      "City",
      "ZipCode",
      "State",
      "Country",
    ] as const,
    where: {
      CardCode: In(partnerCodes),
      AdresType: In(["B", "S"]),
    } as Record<string, unknown>,
  });
  const addressMap = new Map<
    string,
    {
      billToAddress?: string;
      shipToAddress?: string;
      addresses: {
        addressName: string;
        addressType: "B" | "S";
        addressText: string;
      }[];
    }
  >();

  for (const row of rows) {
    const cardCode = toTrimmed(row.CardCode);
    const addressType = toTrimmed(row.AdresType).toUpperCase();
    const addressName = toTrimmed(row.Address);
    if (!cardCode || (addressType !== "B" && addressType !== "S")) {
      continue;
    }

    const formattedAddress = formatAddress(row);
    if (!formattedAddress) {
      continue;
    }

    const current = addressMap.get(cardCode) ?? { addresses: [] };
    const defaults = defaultsMap?.get(cardCode);
    const isDefaultBillTo = defaults?.billToDef
      ? addressName.toLowerCase() === defaults.billToDef.trim().toLowerCase()
      : !current.billToAddress;
    const isDefaultShipTo = defaults?.shipToDef
      ? addressName.toLowerCase() === defaults.shipToDef.trim().toLowerCase()
      : !current.shipToAddress;

    if (addressType === "B" && (isDefaultBillTo || !current.billToAddress)) {
      current.billToAddress = formattedAddress;
    }
    if (addressType === "S" && (isDefaultShipTo || !current.shipToAddress)) {
      current.shipToAddress = formattedAddress;
    }
    const isDuplicate = current.addresses.some(
      (addr) => addr.addressText.trim().toLowerCase() === formattedAddress.trim().toLowerCase(),
    );
    if (!isDuplicate) {
      current.addresses.push({
        addressName: toTrimmed(row.Address),
        addressType: addressType as "B" | "S",
        addressText: formattedAddress,
      });
    }
    addressMap.set(cardCode, current);
  }

  return addressMap;
};

export const fetchSalesEmployeeNames = async (dbName: string, slpCodes: number[]) => {
  if (slpCodes.length === 0) {
    return new Map<number, string>();
  }

  const repository = await getTenantRepository(dbName, SalesEmployeeSchema);
  const rows = await repository.find({
    select: ["SlpCode", "SlpName"] as const,
    where: { SlpCode: In(slpCodes), Active: "Y" } as Record<string, unknown>,
  });

  const salesEmployeeMap = new Map<number, string>();
  for (const row of rows) {
    const code = toNumberOrZero(row.SlpCode);
    const name = toTrimmed(row.SlpName);
    if (code > 0 && name) {
      salesEmployeeMap.set(code, name);
    }
  }

  return salesEmployeeMap;
};
