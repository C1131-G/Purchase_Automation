// Intercompany Document Map: Tracks source PO → target AR Invoice Draft links in SBOCOMMON.
// Table is ops-owned; this schema only maps existing columns (no synchronize / DDL).

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export type IntercompanyMapStatus = "CREATED" | "FAILED";

export interface IntercompanyDocumentMap {
  sourceDb: string;
  sourceObjectType: string;
  sourceDocEntry: number;
  sourceDocNum?: number | null;
  targetDb?: string | null;
  targetObjectType?: string | null;
  targetDraftEntry?: number | null;
  targetDraftNum?: number | null;
  sourceVendorCode?: string | null;
  targetCustomerCode?: string | null;
  status: IntercompanyMapStatus;
  errorMessage?: string | null;
}

export const IntercompanyDocumentMapSchema = new EntitySchema<IntercompanyDocumentMap>({
  columns: {
    errorMessage: {
      length: 2000,
      name: "ERROR_MESSAGE",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    sourceDb: {
      length: 100,
      name: "SOURCE_DB",
      primary: true,
      type: "nvarchar" as HANAColumnType,
    },
    sourceDocEntry: {
      name: "SOURCE_DOC_ENTRY",
      primary: true,
      type: "int" as HANAColumnType,
    },
    sourceDocNum: {
      name: "SOURCE_DOC_NUM",
      nullable: true,
      type: "int" as HANAColumnType,
    },
    sourceObjectType: {
      length: 20,
      name: "SOURCE_OBJECT_TYPE",
      primary: true,
      type: "nvarchar" as HANAColumnType,
    },
    sourceVendorCode: {
      length: 50,
      name: "SOURCE_VENDOR_CODE",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    status: {
      length: 20,
      name: "STATUS",
      type: "nvarchar" as HANAColumnType,
    },
    targetCustomerCode: {
      length: 50,
      name: "TARGET_CUSTOMER_CODE",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    targetDb: {
      length: 100,
      name: "TARGET_DB",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    targetDraftEntry: {
      name: "TARGET_DRAFT_ENTRY",
      nullable: true,
      type: "int" as HANAColumnType,
    },
    targetDraftNum: {
      name: "TARGET_DRAFT_NUM",
      nullable: true,
      type: "int" as HANAColumnType,
    },
    targetObjectType: {
      length: 20,
      name: "TARGET_OBJECT_TYPE",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
  },
  name: "IntercompanyDocumentMap",
  tableName: "INTERCOMPANY_DOCUMENT_MAP",
});
