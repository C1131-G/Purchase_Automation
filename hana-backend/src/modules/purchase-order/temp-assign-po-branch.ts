/**
 * Re-export document branch helpers (legacy path).
 * Prefer `@/modules/master-data/document-branch` for new code.
 */

export {
  applyDocumentBranchToSapPayload,
  applyPoBranchToSapPayload,
  assignDocumentBranch,
  firstLineWarehouseCode,
  resolveDocumentBranchId,
  resolvePoBranchId,
  type ResolveDocumentBranchInput,
  type ResolveDocumentBranchResult,
  type ResolveDocumentBranchInput as ResolvePoBranchInput,
  type ResolveDocumentBranchResult as ResolvePoBranchResult,
} from "@/modules/master-data/document-branch";
