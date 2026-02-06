// User Schema: Maps to the native SAP B1 'OUSR' table.
// We augment the standard SAP user record with custom fields (U_PortalPassword) to support secure portal authentication without modifying SAP core logic.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export type User = {
  USER_CODE: string; // The primary login identifier in SAP.
  U_NAME: string; // The display name or full name of the user.
  U_PortalPassword?: string; // Hashed password specifically for portal access.
  U_Role?: string; // Application-level role for RBAC.
  U_CardCode?: string; // If 'V' (Vendor role), this links the user to a specific Business Partner.
  U_CardName?: string;
};

export const UserSchema = new EntitySchema<User>({
  name: "User",
  tableName: "OUSR",
  columns: {
    USER_CODE: {
      primary: true,
      type: "nvarchar" as HANAColumnType,
      length: 100,
      name: "USER_CODE",
    },
    U_NAME: {
      type: "nvarchar" as HANAColumnType,
      length: 100,
      name: "U_NAME",
    },
    U_PortalPassword: {
      type: "nvarchar" as HANAColumnType,
      length: 100,
      name: "U_PortalPassword",
    },
    U_Role: {
      type: "nvarchar" as HANAColumnType,
      length: 50,
      name: "U_Role",
      nullable: true,
    },
    U_CardCode: {
      type: "nvarchar" as HANAColumnType,
      length: 50,
      name: "U_CardCode",
      nullable: true,
    },
    U_CardName: {
      type: "nvarchar" as HANAColumnType,
      length: 100,
      name: "U_CardName",
      nullable: true,
    },
  },
});
