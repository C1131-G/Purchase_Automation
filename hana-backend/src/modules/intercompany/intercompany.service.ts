import { syncPurchaseOrderToArInvoiceDraft } from "./intercompany.mutations";
import {
  findDocumentMapBySource,
  getOrganizationByDbName,
  getOtherOrganizations,
  resolvePoToArInvoiceMapping,
} from "./intercompany.queries";

export {
  syncPurchaseOrderToArInvoiceDraft,
  findDocumentMapBySource,
  getOrganizationByDbName,
  getOtherOrganizations,
  resolvePoToArInvoiceMapping,
};

export const intercompanyService = {
  syncPurchaseOrderToArInvoiceDraft,
  findDocumentMapBySource,
  resolvePoToArInvoiceMapping,
};
