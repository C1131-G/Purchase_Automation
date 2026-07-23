import { createTaxMappingQueries, type TaxMappingQueries } from "./tax-mapping.queries";

export type TaxMapResult =
  | { hit: true; targetTaxCode: string }
  | { hit: false; sourceTaxCode: string };

export type TaxMappingService = {
  mapTax: (
    sourceCompanyId: number,
    targetCompanyId: number,
    sourceTaxCode: string,
  ) => Promise<TaxMapResult>;
};

export const createTaxMappingService = (
  queries: TaxMappingQueries = createTaxMappingQueries(),
): TaxMappingService => ({
  mapTax: async (sourceCompanyId, targetCompanyId, sourceTaxCode) => {
    const row = await queries.findMapping(sourceCompanyId, targetCompanyId, sourceTaxCode);
    if (!row) {
      return { hit: false, sourceTaxCode };
    }
    return { hit: true, targetTaxCode: row.targetTaxCode };
  },
});

export const taxMappingService = createTaxMappingService();
