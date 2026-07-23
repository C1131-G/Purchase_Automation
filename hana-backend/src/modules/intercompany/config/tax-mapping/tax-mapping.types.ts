export type IcTaxMapping = {
  taxMapId: number;
  sourceCompanyId: number;
  targetCompanyId: number;
  sourceTaxCode: string;
  targetTaxCode: string;
  isActive: boolean;
};
