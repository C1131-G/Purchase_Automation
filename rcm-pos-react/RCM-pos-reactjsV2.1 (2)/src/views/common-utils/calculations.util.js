import { round } from "../../config/util.js";
import { PRECISION, TOTAL_AMT_PRECISION } from "../../config/config.js";

/**
 * Calculates the Total Price based on the Discount & Price per Unit
 * @param {*} quantity
 * @param {*} unitPrice
 * @param {*} discountPercent
 * @param {*} taxAmount
 * @returns
 */
export const getTotalPrice = (quantity, unitPrice, discountPercent = 0, taxAmount = 0) => {
  const itemTotal = parseFloat(quantity) * parseFloat(unitPrice);
  const itemDiscount = (itemTotal * parseFloat(discountPercent)) / 100 || 0;
  return round(itemTotal - itemDiscount + taxAmount, PRECISION);
};

/**
 * NOTE: Copied from `calculateRowLevelTax()`
 *
 * Calculates tax for the Item based on the values passed. Here the params will be parsed into 'Float'
 * @param {String} quantity   Quantity of the item
 * @param {String} unitPrice  Unit Price of the item
 * @param {String} discountPercent
 * @param {String} taxPercent Tax % of the item
 */
export const getTaxAmount = (quantity, unitPrice, discountPercent = 0, taxPercent = 0) => {
  //TaxAmt = ((Qty * Price) - Discount) * Tax %
  if (!taxPercent || isNaN(parseFloat(taxPercent))) {
    return 0;
  } else {
    const itemTotal = parseFloat(quantity) * parseFloat(unitPrice);
    const itemDiscount = (itemTotal * parseFloat(discountPercent)) / 100;
    const amountAfterDiscount = itemTotal - itemDiscount;
    return round((amountAfterDiscount * parseFloat(taxPercent)) / 100, PRECISION);
  }
};

/**
 * NOTE: Copied from `calculateRowLevelTax()`
 *
 * Calculates tax for the Item based on the values passed. Here the params will be parsed into 'Float'
 * @param {String} totalPrice   (unitPrice * quantity) with applied discount of the item
 * @param {String} taxPercent Tax % of the item
 */
export const getTaxAmountbyTotalPrice = (totalPrice, taxPercent = 0) => {
  //TaxAmt = ((Qty * Price) - Discount) * Tax %
  if (!taxPercent || isNaN(parseFloat(taxPercent))) {
    return 0;
  } else {
    return round((totalPrice * parseFloat(taxPercent)) / 100, PRECISION);
  }
};

/**
 * NOTE: Copied from `calculateRowLevelTax()`
 *
 * Calculates tax for the Item based on the values passed. Here the params will be parsed into 'Float'
 * @param {String} totalPrice   (Gross Price) with applied Tax of the item
 * @param {String} taxPercent Tax % of the item
 */
export const getTaxAmountbyTotalGrossPrice = (totalPrice, quantity, taxPercent = 0) => {
  //TaxAmt = ((Qty * Price) - Discount) * Tax %
  if (!taxPercent || isNaN(parseFloat(taxPercent))) {
    return 0;
  } else {
    return round(
      (totalPrice * quantity * parseFloat(taxPercent)) / (100 + parseFloat(taxPercent)),
      PRECISION,
    );
  }
};

/**
 * Calculates the price per `Quantity` after the tax is added and discount subtracted
 * @param {*} unitPrice
 * @param {*} discountPercent
 * @param {*} taxPercent
 */
export const getNetUnitPrice = (unitPrice, discountPercent = 0, taxPercent = 0) => {
  const quantity = 1;
  const taxAmount = getTaxAmount(quantity, unitPrice, discountPercent, taxPercent);
  const netPrice = getTotalPrice(quantity, unitPrice, discountPercent, taxAmount);
  return netPrice;
};

export const getNetUnitPricebyRoundTotalPrice = (
  unitPrice,
  discountPercent = 0,
  taxPercent = 0,
) => {
  const quantity = 1;
  const totalPrice = round(
    getTotalPrice(quantity, unitPrice, discountPercent),
    TOTAL_AMT_PRECISION,
  );
  const taxAmount = round(getTaxAmountbyTotalPrice(totalPrice, taxPercent), TOTAL_AMT_PRECISION);
  const netPrice = totalPrice + taxAmount;
  return netPrice;
};

export const getNetUnitPricebyTotalPrice = (unitPrice, discountPercent = 0, taxPercent = 0) => {
  const quantity = 1;
  const totalPrice = round(
    getTotalPrice(quantity, unitPrice, discountPercent),
    TOTAL_AMT_PRECISION,
  );
  const taxAmount = round(getTaxAmountbyTotalPrice(totalPrice, taxPercent), TOTAL_AMT_PRECISION);
  const netPrice = totalPrice + taxAmount;
  return netPrice;
};

/**
 * Calculates tax for the Item based on the values passed. Here the params will be parsed into 'Float'
 * @param {String} quantity   Quantity of the item
 * @param {String} unitPrice  Unit Price of the item
 * @param {String} discountPercent
 * @param {String} taxPercent Tax % of the item
 */
export const getDiscountAmount = (quantity, unitPrice, discountPercent = 0, taxPercent = 0) => {
  if (!discountPercent || isNaN(parseFloat(discountPercent))) {
    return 0;
  } else {
    const itemTotal = parseFloat(quantity) * parseFloat(unitPrice);
    return round((itemTotal * parseFloat(discountPercent)) / 100, PRECISION);
  }
};

/**
 * Calculates Surcharge for Card Payment
 * @param {*} amount  Amount paid via Card
 * @param {*} surchargePercent
 * @param {*} precision
 * @returns
 */
export const calculateSurcharge = (amountPaidViaCard, surchargePercent, precision = 2) => {
  if (surchargePercent && amountPaidViaCard) {
    const surchargeAmount = (amountPaidViaCard * surchargePercent) / 100;
    return surchargeAmount ? round(surchargeAmount, precision) : 0;
  } else {
    return 0;
  }
};

/**
 * Returns Total Quantity that's added for Invoice
 * @param {*} items
 * @returns
 */
export const getTotalQuantity = (items) => {
  let totalQty = 0;
  if (Array.isArray(items) && items.length > 0) {
    items.forEach((item) => {
      totalQty += parseFloat(item.Quantity);
    });
    return round(totalQty, PRECISION);
  }
  return totalQty;
};

/**
 * Returns Total Tax Amount
 * @param {*} items
 * @returns
 */
export const getTaxableAmount = (items) => {
  let total = 0;
  if (Array.isArray(items) && items.length > 0) {
    items.forEach((item) => {
      total += parseFloat(item.TotalPrice ? item.TotalPrice : item.LineTotal);
    });
    return round(total, PRECISION);
  }
  return total;
};

/**
 * Calculates Total Tax based on the Total Amount & Tax%
 * @param {*} items
 * @param {*} taxProp
 * @returns
 */
export const getTotalTax = (items, taxProp) => {
  let taxAmount = 0;
  if (Array.isArray(items) && items.length > 0) {
    items.forEach((item) => {
      taxAmount += round(item[taxProp], PRECISION);
    });
    return round(taxAmount, PRECISION);
  }
  return taxAmount;
};

/**
 * Adds the Tax% with Total Price and returns the value
 * @param {Number} precision
 * @param {String} taxProp
 * @param {Number} precision
 * @returns
 */
export const getTotalAmount = (items, taxProp, precision = 2) => {
  let invoiceAmount = 0;
  if (Array.isArray(items) && items.length > 0) {
    const taxableAmount = getTaxableAmount(items);
    if (taxableAmount > 0) {
      invoiceAmount = round(taxableAmount + getTotalTax(items, taxProp), precision);
    }
    return invoiceAmount;
  }
  return invoiceAmount;
};

/**
 * Adds the Tax% with Total Price and returns the value
 * @param {Number} precision
 * @param {String} taxProp
 * @param {Number} precision
 * @returns
 */
export const getTotalAmountbyTotalPrice = (items, taxProp, precision = 2) => {
  let invoiceAmount = 0;
  if (Array.isArray(items) && items.length > 0) {
    const taxableAmount = getTaxableAmount(items);
    if (taxableAmount > 0) {
      invoiceAmount = round(taxableAmount, precision);
    }
    return invoiceAmount;
  }
  return invoiceAmount;
};

/**
 * Rounds a price to the nearest 0.05 increment.
 * @param {number} price - The price to be rounded.
 * @returns {number} - The rounded price.
 */
export const roundPrice = (price) => {
  if (!price || isNaN(parseFloat(price))) {
    return "0.00";
  }

  // Convert the price to a string with 2 decimal places
  let precisePrice = parseFloat(price).toFixed(2);

  // Multiply by 100 to work with cents (e.g., 1.234 -> 123.40)
  let priceInCents = parseFloat(precisePrice) * 100;

  // Round the decimal part to the nearest 0.05 (5 in integer)
  let roundedDecimalNum = Math.round(priceInCents / 5) * 5;

  // Divide by 100 to get back to the original scale
  let roundedPrice = roundedDecimalNum / 100;

  return parseFloat(roundedPrice.toFixed(2));
};
