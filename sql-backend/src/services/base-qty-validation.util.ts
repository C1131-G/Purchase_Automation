export const validateBaseQuantity = (qty: number, baseQty: number): boolean => {
  if (baseQty === 0) {
    return qty === 0;
  }
  return Math.abs(qty - baseQty) < 0.001;
};

export const calculateBaseQty = (quantity: number, _uomEntry: number, _uomCode: string): number =>
  quantity;

export const baseQtyValidation = { calculateBaseQty, validateBaseQuantity };
