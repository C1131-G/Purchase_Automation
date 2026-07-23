export type IcCompany = {
  companyId: number;
  companyCode: string;
  companyName: string;
  sapDbName: string;
  defaultBranchId: number | null;
  isActive: boolean;
};
