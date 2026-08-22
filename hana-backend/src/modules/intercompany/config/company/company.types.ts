export type IcCompany = {
  companyId: number;
  companyCode: string;
  companyName: string;
  sapDbName: string;
  defaultBranchId: number | null;
  isActive: boolean;
  /** Seller Flow 2 delivery mode. Only IC_COMPANY.PARK='YES' enables POS parking. */
  park: boolean;
};
