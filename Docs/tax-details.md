# Pricing & Tax Model Reference

This document details the current pricing model (tax-exclusive vs. tax-inclusive) used in the Vendor Portal, the files and functions implementing it, and the changes required to switch to a tax-inclusive pricing model.

---

## 1. Current Pricing Model: Tax-Exclusive

The Vendor Portal currently operates under a **tax-exclusive (pre-tax) pricing model**. 

* **Unit Prices**: All unit prices entered by users, imported via Excel, or retrieved from the database represent the price **before tax** is applied.
* **Line Net Subtotal**: Subtotal after line discount, but before tax is calculated.
* **Tax Calculation**: Tax (VAT) is calculated on top of the net subtotal and added to compute the final inclusive total.

### Mathematical Formulas Currently in Use
1. **Gross Subtotal**:
   $$\text{Gross} = \text{UnitPrice} \times \text{Quantity}$$
2. **Net Line Subtotal**:
   $$\text{LineNet} = \text{Gross} - \text{DiscountAmount}$$
3. **Line Tax (VAT)**:
   $$\text{LineTax} = \text{LineNet} \times \left(\frac{\text{TaxRate}}{100}\right)$$
4. **Inclusive Line Total**:
   $$\text{LineTotal} = \text{LineNet} + \text{LineTax}$$

---

## 2. Key Files & Functions Involved

The following files and functions manage pricing, tax calculations, and database mapping:

### A. Frontend Calculations
* **File**: `frontend/src/features/create-pages/create-shared/utils/create-order.calculations.ts`
  * **Function**: `calculateLineTotals(row: ProductRow)`
    * Calculates gross total, applies discount to get `lineNet`, computes `lineTax` on top of the net, and sums them for `lineTotal`.
  * **Function**: `calculateOrderTotals(productRows: ProductRow[], _options?: CalculateOrderTotalsOptions)`
    * Sums line items, calculates the weighted average tax rate, and computes overall `netTotal`, `taxTotal`, and `grandTotal`.

### B. Backend DB Hydration & Normalization
* **File**: `hana-backend/src/services/sap-line-utils.ts`
  * **Function**: `normalizeSAPLineData(line: Record<string, unknown>)`
    * Standardizes line responses from SAP HANA (which generally return pre-tax prices) and back-calculates pre-discount unit prices using `PriceBefDi` or formula-based reconstruction for frontend hydration.

### C. Backend DB Schema Mapping
* **Files**: `hana-backend/src/db/schemas/*-line.schema.ts` (e.g., `purchase-quotation-line.schema.ts`, `goods-receipt-line.schema.ts`)
  * Maps fields like `Price` to native SAP B1 line tables (e.g., `PQT1.Price`, `PDN1.Price`), which store the pre-tax unit price.

### D. Service Layer Integration
* **Files**: `hana-backend/src/services/*.service.ts` (e.g., `purchase-order.service.ts`, `grpo.service.ts`)
  * Maps line data and discount/pricing fields into payloads sent to the SAP B1 Service Layer API during document creation or updates.

---

## 3. Transitioning to a Tax-Inclusive Pricing Model

To change the portal to a **tax-inclusive pricing model** (where the unit price already includes tax), the following modifications are required:

### Step 1: Update Frontend Calculation Logic
In `create-order.calculations.ts`, update `calculateLineTotals` to treat `row.price` as tax-inclusive and back-calculate the tax/net components:
* **Gross Total (Inclusive)**:
  $$\text{Gross}_{\text{inclusive}} = \text{UnitPrice}_{\text{inclusive}} \times \text{Quantity}$$
* **Line Subtotal (Inclusive, post-discount)**:
  $$\text{LineTotal}_{\text{inclusive}} = \text{Gross}_{\text{inclusive}} \times \left(1 - \frac{\text{DiscountPercent}}{100}\right)$$
* **Back-Calculated Tax (VAT)**:
  $$\text{LineTax} = \text{LineTotal}_{\text{inclusive}} - \left( \frac{\text{LineTotal}_{\text{inclusive}}}{1 + \frac{\text{TaxRate}}{100}} \right)$$
* **Pre-Tax Line Subtotal (Net)**:
  $$\text{LineNet} = \text{LineTotal}_{\text{inclusive}} - \text{LineTax}$$

### Step 2: Add Database Column Mappings
Update backend TypeORM line schema files (e.g., `purchase-quotation-line.schema.ts`) to map and retrieve the tax-inclusive price column from SAP B1 (`PriceAfVAT`):
```typescript
priceAfterVAT: {
  name: "PriceAfVAT",
  type: "decimal" as HANAColumnType,
  precision: 19,
  scale: 6,
}
```

### Step 3: Update Service Layer payloads
Update backend creation service files (e.g., `purchase-order.service.ts`) to map the tax-inclusive price to the native SAP B1 `PriceAfterVAT` Service Layer property when submitting documents:
```typescript
DocumentLines: productRows.map((row) => ({
  ItemCode: row.ItemCode,
  Quantity: row.Quantity,
  TaxCode: row.TaxCode,
  PriceAfterVAT: row.Price, // Maps the tax-inclusive price
  DiscountPercent: row.DiscountPercent,
  WarehouseCode: row.WarehouseCode,
}))
```

### Step 4: Adjust Excel Import & UI Labels
* Update Excel import utilities (`use-excel-import.ts`) to read inclusive unit prices.
* Update table headers and input descriptions in the UI to display *Unit Price (Tax Incl.)*.
