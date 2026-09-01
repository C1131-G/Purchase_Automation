import { BusinessPartnerSchema } from "@/db/schemas/business-partner.schema";
import { SalesEmployeeSchema } from "@/db/schemas/sales-employee.schema";
import { getTenantRepository } from "@/db/tenant-query";

/** Resolve a seller-company BP's active default salesperson. Failures are non-fatal for IC. */
export const resolveBusinessPartnerSalesPersonCode = async (
  dbName: string,
  cardCode: string,
): Promise<number | null> => {
  const normalizedDb = dbName.trim();
  const normalizedCardCode = cardCode.trim();
  if (!normalizedDb || !normalizedCardCode) return null;
  try {
    const bpRepository = await getTenantRepository(normalizedDb, BusinessPartnerSchema);
    const partner = await bpRepository.findOne({
      select: ["CardCode", "SlpCode"],
      where: { CardCode: normalizedCardCode },
    });
    const code = Number(partner?.SlpCode);
    if (!Number.isFinite(code) || code <= 0) return null;
    const salespersonRepository = await getTenantRepository(normalizedDb, SalesEmployeeSchema);
    const employee = await salespersonRepository.findOne({
      select: ["SlpCode", "Active"],
      where: { SlpCode: Math.trunc(code), Active: "Y" },
    });
    return employee ? Math.trunc(code) : null;
  } catch {
    return null;
  }
};
