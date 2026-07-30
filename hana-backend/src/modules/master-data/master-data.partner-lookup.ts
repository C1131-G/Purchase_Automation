import { In } from "typeorm";

import { getTenantRepository } from "@/db/tenant-query";
import { BusinessPartnerAddressSchema } from "@/db/schemas/business-partner-address.schema";
import type { BusinessPartnerAddress } from "@/db/schemas/business-partner-address.schema";
import { BusinessPartnerSchema } from "@/db/schemas/business-partner.schema";
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

export type PartnerAddressRow = {
  addressName: string;
  addressType: "B" | "S";
  addressText: string;
};

export type PartnerAddressBundle = {
  billToAddress?: string;
  shipToAddress?: string;
  addresses: PartnerAddressRow[];
};

export type FetchBusinessPartnerAddressesOptions = {
  /**
   * When false (list endpoints), only default bill/ship strings are built.
   * Full `addresses[]` is omitted from the map values to keep list payloads small.
   */
  includeAddressList?: boolean;
};

export const fetchBusinessPartnerAddresses = async (
  dbName: string,
  partnerCodes: string[],
  defaultsMap?: Map<string, { billToDef?: string; shipToDef?: string }>,
  options?: FetchBusinessPartnerAddressesOptions,
) => {
  const includeAddressList = options?.includeAddressList !== false;

  if (partnerCodes.length === 0) {
    return new Map<string, PartnerAddressBundle>();
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
  const addressMap = new Map<string, PartnerAddressBundle>();

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
    if (includeAddressList) {
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
    }
    addressMap.set(cardCode, current);
  }

  return addressMap;
};

/** Single-partner address bundle for lazy UI (bill/ship pickers). */
export const getBusinessPartnerAddresses = async (dbName: string, cardCodeRaw: string) => {
  const cardCode = toTrimmed(cardCodeRaw);
  if (!cardCode) {
    return {
      cardCode: "",
      billToAddress: "",
      shipToAddress: "",
      addresses: [] as PartnerAddressRow[],
    };
  }

  const bpRepo = await getTenantRepository(dbName, BusinessPartnerSchema);
  const partner = await bpRepo.findOne({
    select: ["CardCode", "Address", "BillToDef", "ShipToDef"] as const,
    where: { CardCode: cardCode } as Record<string, unknown>,
  });

  const defaultsMap = new Map<string, { billToDef?: string; shipToDef?: string }>();
  if (partner) {
    defaultsMap.set(cardCode, {
      billToDef: partner.BillToDef,
      shipToDef: partner.ShipToDef,
    });
  }

  const addressMap = await fetchBusinessPartnerAddresses(dbName, [cardCode], defaultsMap, {
    includeAddressList: true,
  });
  const bundle = addressMap.get(cardCode);
  const fallback = toTrimmed(partner?.Address) || "";
  const billToAddress = bundle?.billToAddress ?? fallback;
  const shipToAddress = bundle?.shipToAddress ?? billToAddress;

  return {
    cardCode,
    billToAddress,
    shipToAddress,
    addresses: bundle?.addresses ?? [],
  };
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
