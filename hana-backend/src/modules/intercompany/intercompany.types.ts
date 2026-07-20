import type { IntercompanyMapStatus } from "@/db/schemas/intercompany-document-map.schema";

export interface IntercompanyOrgRow {
  dbName: string;
  companyName?: string;
  serviceLayerUsername?: string;
  serviceLayerPassword?: string;
  vendorCode?: string;
  customerCode?: string;
}

export interface IntercompanyMappingResolution {
  sourceDb: string;
  sourceVendorCode: string;
  targetDb: string;
  targetCustomerCode: string;
  targetServiceLayerUsername: string;
  targetServiceLayerPassword: string;
}

export interface IntercompanySyncResult {
  /** True only when a target AR invoice draft was created in this call (or already existed as CREATED). */
  created: boolean;
  skipped?: boolean;
  reason?: string;
  status?: IntercompanyMapStatus;
  sourceDb?: string;
  sourceDocEntry?: number;
  sourceDocNum?: number;
  targetDb?: string;
  targetDraftEntry?: number;
  targetDraftNum?: number;
  sourceVendorCode?: string;
  targetCustomerCode?: string;
  errorMessage?: string;
  existingMapping?: boolean;
}

export interface PoDocumentLineInput {
  ItemCode?: unknown;
  Quantity?: unknown;
  UnitPrice?: unknown;
  Price?: unknown;
  DiscountPercent?: unknown;
  UoMEntry?: unknown;
  UomEntry?: unknown;
  UoMCode?: unknown;
  UomCode?: unknown;
  VatGroup?: unknown;
  WarehouseCode?: unknown;
}

export interface PoDocumentInput {
  CardCode?: unknown;
  DocDate?: unknown;
  DocDueDate?: unknown;
  Comments?: unknown;
  NumAtCard?: unknown;
  DocumentLines?: PoDocumentLineInput[];
}
