export interface ReconciliationResult {
  matched: boolean;
  differences: string[];
}

export const reconcilePurchaseOrder = (_po: unknown, _grpo: unknown): ReconciliationResult => ({
  differences: [],
  matched: true,
});

export const reconcileLine = (_poLine: unknown, _grpoLine: unknown): boolean => true;

export const poReconcile = { reconcileLine, reconcilePurchaseOrder };
