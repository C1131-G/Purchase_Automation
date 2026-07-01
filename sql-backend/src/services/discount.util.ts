// Discount Utility: Shared calculation for document line discount amounts.

export const calculateDiscountAmount = (
  price: number,
  quantity: number,
  discountPercent: number,
): number => {
  const total = price * quantity;
  return total * (discountPercent / 100);
};

export const calculateNetTotal = (
  price: number,
  quantity: number,
  discountPercent: number = 0,
): number => {
  const total = price * quantity;
  return total - calculateDiscountAmount(price, quantity, discountPercent);
};

export const calculateLineTotal = (
  price: number,
  quantity: number,
  discountPercent: number = 0,
): number => {
  return calculateNetTotal(price, quantity, discountPercent);
};
