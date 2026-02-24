export const getSearchPrereqMissing = (
  vendorName: string,
  vendorCode: string,
  warehouse: string,
  buyer: string,
) => ({
  vendorName: !vendorName.trim(),
  vendorCode: !vendorCode.trim(),
  warehouse: !warehouse.trim(),
  buyer: !buyer.trim(),
})

export const canCreateGRPO = (missing: Record<string, boolean>) =>
  Object.values(missing).every((isMissing) => !isMissing)
