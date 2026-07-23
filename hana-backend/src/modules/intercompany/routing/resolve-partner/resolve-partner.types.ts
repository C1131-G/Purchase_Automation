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
