import { getCommonDataSource } from "@/db/config/data-source";
import { OrganizationSchema } from "@/db/schemas/organization.schema";

export const getOrganizations = async () => {
  const ds = await getCommonDataSource();
  const repo = ds.getRepository(OrganizationSchema);
  return repo.find({ where: { isActive: true } });
};

export const getOrganizationByDbName = async (dbName: string) => {
  const ds = await getCommonDataSource();
  const repo = ds.getRepository(OrganizationSchema);
  return repo.findOne({ where: { dbName, isActive: true } });
};

export const createOrganization = async (data: Partial<OrganizationSchema>) => {
  const ds = await getCommonDataSource();
  const repo = ds.getRepository(OrganizationSchema);
  const org = repo.create(data);
  return repo.save(org);
};

export const organizationService = {
  createOrganization,
  getOrganizationByDbName,
  getOrganizations,
};
