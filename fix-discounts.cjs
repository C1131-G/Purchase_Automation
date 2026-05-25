const fs = require("fs");

const files = [
  "hana-backend/src/services/sales-quotation.service.ts",
  "hana-backend/src/services/sales-order.service.ts",
  "hana-backend/src/services/ar-invoice.service.ts",
  "hana-backend/src/services/ar-credit-memo.service.ts",
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, "utf8");

  // Replace create method payload
  content = content.replace(
    /const sapPayload: Record<string, unknown> = {([\s\S]*?)DocumentLines: \(payload\.DocumentLines as Record<string, unknown>\[\]\)\?\.map\(\(.*?\) => {([\s\S]*?)PriceBefDi: rawUnitPrice,\s*UnitPrice: netUnitPrice,\s*(UoMEntry: .*?,\s*VatGroup: .*?,\s*WarehouseCode: .*?,)\s*DiscountPercent: discountPercent,\s*};/g,
    (match, pre, inner, uomVatWhse) => {
      // pre contains things like Address, CardCode, Comments, DocDate, DocDueDate
      // inner contains ItemCode, Quantity calculation
      // uomVatWhse contains UoMEntry, VatGroup, WarehouseCode
      const varName = inner.includes("item.ItemCode") ? "item" : "line";
      return `
    let totalGross = 0;
    let totalDiscount = 0;
    const lines = (payload.DocumentLines as Record<string, unknown>[]) || [];
    lines.forEach((l) => {
      const p = (l.UnitPrice || l.Price) as number || 0;
      const q = (l.Quantity as number) || 1;
      const d = (l.DiscountPercent as number) || 0;
      totalGross += (p * q);
      totalDiscount += (p * q * (d / 100));
    });
    const headerDiscountPercent = totalGross > 0 ? (totalDiscount / totalGross) * 100 : 0;

    const sapPayload: Record<string, unknown> = {${pre}DiscountPercent: headerDiscountPercent,
      DocumentLines: lines.map((${varName}) => {
        const docLine: Record<string, unknown> = {
          ItemCode: ${varName}.ItemCode as string,
          Quantity: ${varName}.Quantity as number,
          UnitPrice: (${varName}.UnitPrice || ${varName}.Price) as number,
          ${uomVatWhse.trim()}
        };`;
    },
  );

  // Replace update method payload
  content = content.replace(
    /const lines = payload\.DocumentLines as Record<string, unknown>\[\];\s*if \(lines\) {\s*sapPayload\.DocumentLines = lines\.map\(\(.*?\) => {([\s\S]*?)PriceBefDi: rawUnitPrice,\s*UnitPrice: netUnitPrice,\s*(UoMEntry: .*?,\s*VatGroup: .*?,\s*WarehouseCode: .*?,)\s*DiscountPercent: discountPercent,\s*};/g,
    (match, inner, uomVatWhse) => {
      const varName = inner.includes("item.ItemCode") ? "item" : "line";
      return `const lines = payload.DocumentLines as Record<string, unknown>[];
    if (lines) {
      let totalGross = 0;
      let totalDiscount = 0;
      lines.forEach((l) => {
        const p = (l.UnitPrice || l.Price) as number || 0;
        const q = (l.Quantity as number) || 1;
        const d = (l.DiscountPercent as number) || 0;
        totalGross += (p * q);
        totalDiscount += (p * q * (d / 100));
      });
      sapPayload.DiscountPercent = totalGross > 0 ? (totalDiscount / totalGross) * 100 : 0;

      sapPayload.DocumentLines = lines.map((${varName}) => {
        const docLine: Record<string, unknown> = {
          ItemCode: ${varName}.ItemCode as string,
          Quantity: ${varName}.Quantity as number,
          UnitPrice: (${varName}.UnitPrice || ${varName}.Price) as number,
          ${uomVatWhse.trim()}
        };`;
    },
  );

  fs.writeFileSync(file, content);
}
console.log("Done!");
