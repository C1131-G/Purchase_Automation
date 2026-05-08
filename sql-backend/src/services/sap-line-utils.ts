export interface SapLine {
  lineNum: number;
  itemCode: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export const calculateLineTotal = (quantity: number, unitPrice: number): number =>
  Math.round(quantity * unitPrice * 100) / 100;

export const formatSapLine = (line: SapLine): SapLine => ({
  ...line,
  lineTotal: calculateLineTotal(line.quantity, line.unitPrice),
});

export const sapLineUtils = { calculateLineTotal, formatSapLine };
