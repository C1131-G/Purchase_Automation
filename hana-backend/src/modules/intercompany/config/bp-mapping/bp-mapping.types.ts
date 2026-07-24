export type IcBpMapping = {
  mappingId: number;
  buyerCompanyId: number;
  vendorCompanyId: number;
  vendorCode: string;
  buyerCustomerCode: string;
  isActive: boolean;
  remarks: string | null;
};

/** Mapping row with optional IC_COMPANY names (list / overview). */
export type IcBpMappingWithCompanies = IcBpMapping & {
  buyerCompanyName: string | null;
  vendorCompanyName: string | null;
};
