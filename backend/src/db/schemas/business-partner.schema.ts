// Business Partner Schema: Maps to the native SAP B1 'OCRD' table.
// Represents Customers ('C') and Vendors ('S') in the system.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export type BusinessPartner = {
  CardCode: string; // The primary code used across all SAP transactions.
  CardName: string; // Company name.
  Address?: string; // Bill-to address summary.
  Currency?: string; // Master currency (e.g., 'INR', 'USD').
  SlpCode?: number; // Linked sales employee code.
  CardType: string; // 'C' = Customer, 'S' = Vendor.
  frozenFor?: string; // 'Y' if the account is deactivated in SAP.
};

export const BusinessPartnerSchema = new EntitySchema<BusinessPartner>({
  name: "BusinessPartner",
  tableName: "OCRD",
  columns: {
    CardCode: { primary: true, type: "nvarchar" as HANAColumnType, length: 15, name: "CardCode" },
    CardName: { type: "nvarchar" as HANAColumnType, length: 100, name: "CardName" },
    Address: { type: "nvarchar" as HANAColumnType, length: 100, name: "Address", nullable: true },
    Currency: { type: "nvarchar" as HANAColumnType, length: 3, name: "Currency", nullable: true },
    SlpCode: { type: "int" as HANAColumnType, name: "SlpCode", nullable: true },
    CardType: { type: "nvarchar" as HANAColumnType, length: 1, name: "CardType" },
    frozenFor: { type: "nvarchar" as HANAColumnType, length: 1, name: "frozenFor", default: "N" },
  },
});
