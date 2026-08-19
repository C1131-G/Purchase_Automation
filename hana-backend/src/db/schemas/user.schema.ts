// User Schema: Maps to the native SAP B1 'OUSR' table.
// We augment the standard SAP user record with custom fields (U_PortalPassword) to support secure portal authentication without modifying SAP core logic.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface User {
  USER_CODE: string; // The primary login identifier in SAP.
  U_NAME: string; // The display name or full name of the user.
  U_PortalPassword?: string; // bcrypt (cost 10) or leftover plaintext portal password.
  U_Role?: string; // Application-level role for RBAC.
  U_CardCode?: string; // If 'V' (Vendor role), this links the user to a specific Business Partner.
  U_CardName?: string;
}

export const UserSchema = new EntitySchema<User>({
  columns: {
    USER_CODE: {
      length: 100,
      name: "USER_CODE",
      primary: true,
      type: "nvarchar" as HANAColumnType,
    },
    U_CardCode: {
      length: 50,
      name: "U_CardCode",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    U_CardName: {
      length: 100,
      name: "U_CardName",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    U_NAME: {
      length: 100,
      name: "U_NAME",
      type: "nvarchar" as HANAColumnType,
    },
    U_PortalPassword: {
      length: 100,
      name: "U_PortalPassword",
      type: "nvarchar" as HANAColumnType,
    },
    U_Role: {
      length: 50,
      name: "U_Role",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
  },
  name: "User",
  tableName: "OUSR",
});
