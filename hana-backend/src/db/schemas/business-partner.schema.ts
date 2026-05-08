// Business Partner Schema: Maps to the native SAP B1 'OCRD' table.
// Represents Customers ('C') and Vendors ('S') in the system.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface BusinessPartner {
  CardCode: string; // The primary code used across all SAP transactions.
  CardName: string; // Company name.
  Address?: string; // Bill-to address summary.
  Currency?: string; // Master currency (e.g., 'INR', 'USD').
  SlpCode?: number; // Linked sales employee code.
  CardType: string; // 'C' = Customer, 'S' = Vendor.
  frozenFor?: string; // 'Y' if the account is deactivated in SAP.
}

export const BusinessPartnerSchema = new EntitySchema<BusinessPartner>({
  columns: {
    Address: {
      length: 100,
      name: "Address",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    CardCode: {
      length: 15,
      name: "CardCode",
      primary: true,
      type: "nvarchar" as HANAColumnType,
    },
    CardName: {
      length: 100,
      name: "CardName",
      type: "nvarchar" as HANAColumnType,
    },
    CardType: {
      length: 1,
      name: "CardType",
      type: "nvarchar" as HANAColumnType,
    },
    Currency: {
      length: 3,
      name: "Currency",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    SlpCode: { name: "SlpCode", nullable: true, type: "int" as HANAColumnType },
    frozenFor: {
      default: "N",
      length: 1,
      name: "frozenFor",
      type: "nvarchar" as HANAColumnType,
    },
  },
  name: "BusinessPartner",
  tableName: "OCRD",
});
