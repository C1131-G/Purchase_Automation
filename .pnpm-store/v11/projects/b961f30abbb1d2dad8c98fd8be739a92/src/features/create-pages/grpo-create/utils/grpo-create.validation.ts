export const getSearchPrereqMissing = (
  vendorName: string,
  vendorCode: string,
  warehouse: string,
  buyer: string,
) => ({
  buyer: !buyer.trim(),
  vendorCode: !vendorCode.trim(),
  vendorName: !vendorName.trim(),
  warehouse: !warehouse.trim(),
});

export const canCreateGRPO = (missing: Record<string, boolean>) =>
  Object.values(missing).every((isMissing) => !isMissing);
