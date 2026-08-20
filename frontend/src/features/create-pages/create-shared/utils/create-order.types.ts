import type { PropsWithChildren } from "react";

import type {
  LookupItem,
  ProductLookupItem,
} from "@/features/create-pages/create-shared/api/create-shared.types";

export type PopupMode =
  | "vendor-name"
  | "vendor-code"
  | "warehouse"
  | "sales-employee"
  | "branch"
  | "series";
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
  | "rate"
  | "category"
  | "nextNumber"
> & {
  stock?: number | undefined;
  disabled?: boolean;
};

export type CreateSectionCardProps = PropsWithChildren<{
  title: string;
  className?: string;
}>;

export interface ProductGridRow {
  foreignName?: string | undefined;
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
  /** OITM.ManBtchNum — Y when the item is batch-managed. */
  manBtchNum?: string | undefined;
  /** OITM.ManSerNum — Y when the item is serial-managed. */
  manSerNum?: string | undefined;
  batchNumbers?: ProductBatchAllocation[] | undefined;
  serialNumbers?: ProductSerialAllocation[] | undefined;
}

export interface ProductLotBinFields {
  binAbsEntry?: number | undefined;
  binCode?: string | undefined;
}

export interface ProductBatchAllocation extends ProductLotBinFields {
  admissionDate?: string | undefined;
  batchNumber: string;
  expiryDate?: string | undefined;
  manufacturingDate?: string | undefined;
  notes?: string | undefined;
  quantity: number;
}

export interface ProductSerialAllocation extends ProductLotBinFields {
  expiryDate?: string | undefined;
  internalSerialNumber: string;
  manufacturerSerialNumber?: string | undefined;
  quantity?: number | undefined;
}

export interface ProductGridRowDraft {
  quantity?: string;
  requiredQuantity?: string;
  /** Unit price draft (RFQ seller fill — allows clearing 0 while typing). */
  price?: string;
  discountPercent?: string;
  discountAmount?: string;
}

export type LookupOption = CreateLookupOption;
export type ProductRow = ProductGridRow;
export type ProductRowDraft = ProductGridRowDraft;
export type StockPreviewProduct = Pick<ProductLookupItem, "code" | "name">;
