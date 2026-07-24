import type { IcCompany } from "@/modules/intercompany/config/company/company.types";

export type ResolvePartnerInput = {
  /** Session company SAP DB name (VST_COMMON / IC_COMPANY.SAP_DB_NAME). */
  dbName: string;
  /** Document CardCode (vendor on buyer PO/PQ). */
  cardCode: string;
};

export type ResolvePartnerResult = {
  buyerCompany: IcCompany;
  sellerCompany: IcCompany;
  vendorCode: string;
  /** Customer code on seller company for the buyer. */
  buyerCustomerCode: string;
  bpMappingId: number;
};

/** Why partner resolution failed — logged as `check` / `detail`. */
export type ResolvePartnerFailReason =
  | "missing_card_or_db"
  | "buyer_company_not_found"
  | "buyer_company_inactive"
  | "bp_mapping_not_found"
  | "seller_company_not_found"
  | "seller_company_inactive";

export type ResolvePartnerFailure = {
  success: false;
  reason: ResolvePartnerFailReason;
  /** Machine-readable gate name for logs. */
  check: string;
  detail: string;
  dbName?: string;
  cardCode?: string;
  buyerCompanyId?: number;
  vendorCompanyId?: number;
};

export type ResolvePartnerSuccess = {
  success: true;
  partner: ResolvePartnerResult;
};

export type ResolvePartnerOutcome = ResolvePartnerSuccess | ResolvePartnerFailure;
