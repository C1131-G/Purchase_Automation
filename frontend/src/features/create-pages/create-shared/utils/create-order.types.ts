import type { PropsWithChildren } from "react";

import type {
  LookupItem,
  ProductLookupItem,
} from "@/features/create-pages/create-shared/api/create-shared.types";

export type PopupMode = "vendor-name" | "vendor-code" | "warehouse" | "sales-employee";
export type ActiveDatePicker = "doc" | "delivery" | "required" | null;

export type CreateLookupOption = Pick<
  LookupItem,
  | "code"
  | "name"
  | "billToAddress"
  | "shipToAddress"
  | "salesEmployeeCode"
  | "salesEmployeeName"
  | "uomEntry"
> & {
  stock?: number | undefined;
  disabled?: boolean;
};

export type CreateSectionCardProps = PropsWithChildren<{
  title: string;
  className?: string;
}>;

export interface ProductGridRow {
  id: string;
  productCode: string;
  productName: string;
  stock: number;
  price: number;
  currency: string;
  vatGroup: string;
  taxRate: number;
  uomCode?: string | undefined;
  uomEntry?: number | undefined;
  uomList?: { code: string; name: string; uomEntry?: number | undefined }[] | undefined;
  purchaseUomCode?: string | undefined;
  purchaseUomEntry?: number | undefined;
  salesUomCode?: string | undefined;
  salesUomEntry?: number | undefined;
  /** Quoted qty — drives line totals / SAP Quantity on PQ. */
  quantity: number;
  /** Required qty — SAP RequiredQuantity (PQTReqQty). PQ only. */
  requiredQuantity?: number | undefined;
  openQty?: number | undefined;
  baseQuantity?: number | undefined;
  discountPercent: number;
  discountAmount: number;
  comment: string;
  warehouseCode: string;
  /** Line required date — SAP ReqDate. PQ only. */
  requiredDate?: string | undefined;
  /** Line quoted date — SAP ShipDate. PQ only. */
  quotedDate?: string | undefined;
  lineNum?: number | undefined;
  baseEntry?: number | undefined;
  baseLine?: number | undefined;
  baseType?: number | undefined;
  selected?: boolean | undefined;
  returnReason?: string | undefined;
  binLocationAllocation?: number | undefined;
  accountCode?: string | undefined;
}

export interface ProductGridRowDraft {
  quantity?: string;
  requiredQuantity?: string;
  discountPercent?: string;
  discountAmount?: string;
}

export type LookupOption = CreateLookupOption;
export type ProductRow = ProductGridRow;
export type ProductRowDraft = ProductGridRowDraft;
export type StockPreviewProduct = Pick<ProductLookupItem, "code" | "name">;
