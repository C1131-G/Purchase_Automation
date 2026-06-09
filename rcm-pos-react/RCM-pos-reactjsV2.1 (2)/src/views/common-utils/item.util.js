import {
  getNetUnitPrice,
  getNetUnitPricebyRoundTotalPrice,
  getTaxAmount,
  getTaxAmountbyTotalPrice,
  getTotalPrice,
  getTaxAmountbyTotalGrossPrice,
} from "./calculations.util.js";
import {
  DEFAULT_TAX_CODE,
  DEFAULT_TAX_PERCENT,
  TOTAL_AMT_PRECISION,
  isGrossPriceEnabled,
} from "../../config/config.js";
import { getCustomerSpecialPrice } from "../../helper/customer.js";
import { getValidNumber, round } from "../../config/util.js";

/**
 * Checks if the `itemsList` contains a Batch or Serial Item
 * @param {*} itemsList
 */
export const hasBatchSerialItems = (itemsList) => {
  // NOTE: 'InvntItem' will be "Y" for Batch & Serial Items
  const hasBatchSerial = itemsList.some(
    (item) => item.ManBtchNum === "Y" || item.ManSerNum === "Y",
  ); //|| item.InvntItem === "Y"
  return hasBatchSerial;
};

/**
 * Adds the selectedItem to the cart in the Invoice or SQ screen
 * @param {*} selectedItem  Currently scanned or searched Item
 * @param {*} addedItems    Items from `context` that are already added to the Invoice or SQ
 * @param {*} taxProp       Tax Prop from `context`
 * @param {*} setItem       Setter method from the Invoice or SQ `context`
 * @param {*} updateItem    Update method from the `context`
 * @param {*} getLocationBasedDefaultCardCode   Method to get Location based CardCode from `UserPermissionsContext`
 */
export const handleItemScan = async (
  selectedItem,
  addedItems,
  setItem,
  updateItem,
  taxProp,
  customer,
  isOneTimeCustomer,
  isCODCustomer,
  getLocationBasedDefaultCardCode,
) => {
  console.log("Scanned Item: ", JSON.stringify(selectedItem));

  if (selectedItem) {
    let {
      ItemCode,
      ItemName,
      Price,
      Discount,
      BinAbsEntry,
      InvntryUom,
      WhsCode,
      ManBtchNum,
      ManSerNum,
      ItmsGrpName,
      BinCode,
      PriceListName,
      PriceList,
      FCCCItem,
      SalesUOM,
      InvntItem,
      DiscApplied,
    } = selectedItem;

    try {
      const cardCode = !isOneTimeCustomer
        ? customer.CardCode
        : getLocationBasedDefaultCardCode(isCODCustomer);

      // Get Special Price
      if (cardCode) {
        let specialPrice = "";
        specialPrice = await getCustomerSpecialPrice(cardCode, ItemCode, WhsCode);
        if (specialPrice) {
          // Parse the response dates
          const fromDate = new Date(specialPrice.FromDate);
          const toDate = new Date(specialPrice.ToDate);
          const currentDate = new Date();
          // Check if the current date is within the valid range
          if (currentDate >= fromDate && currentDate <= toDate) {
            // If the current date is within the range, use the special price
            Price = getValidNumber(specialPrice.Price);
          }
          // else {
          //     // If the current date is not within the range, use the header price
          //     Price = getValidNumber(specialPrice.PriceHeader);
          // }
        }
      }
    } catch (err) {
      console.log("Unable to get Special Price. Setting the default Price!");
    }

    let matchingIndex, matchingItem;
    if (addedItems && Array.isArray(addedItems) && addedItems.length > 0) {
      matchingIndex = addedItems.findIndex(
        (item) => item.ItemCode === ItemCode && item.WhsCode === WhsCode,
      );
      matchingItem = addedItems[matchingIndex];
    }

    if (!matchingItem) {
      const netUnitPrice = isGrossPriceEnabled
        ? getNetUnitPricebyRoundTotalPrice(Price, 0, 0)
        : getNetUnitPricebyRoundTotalPrice(Price, 0, DEFAULT_TAX_PERCENT);
      const newItem = {
        ItemCode,
        ItemName,
        Quantity: 1,
        Price,
        VatGroup: DEFAULT_TAX_CODE,
        TaxPercent: DEFAULT_TAX_PERCENT,
        Discount: 0,
        MeasureUnit: InvntryUom,
        FreeText: "",
        ItmsGrpName,
        WhsCode: WhsCode, //storeWHCode,
        BinCode,
        BinAbsEntry,
        NetUnitPrice: netUnitPrice, // Price per Qty after Discount & Tax
        ManBtchNum,
        ManSerNum,
        PriceListName,
        PriceList,
        FCCCItem,
        UomCode: SalesUOM,
        Pcs: 0,
        DiscApplied,
        isNew: true, // Flag to indicate if this is a new item
        InvntItem,
      };

      // Calc. the Tax & Total Price based on the Qty
      const totalPrice = round(
        getTotalPrice(newItem.Quantity, Price, Discount),
        TOTAL_AMT_PRECISION,
      );
      const priceAfterVat = getTotalPrice(1, Price, Discount);
      const taxAmount = isGrossPriceEnabled
        ? getTaxAmountbyTotalGrossPrice(totalPrice, newItem.Quantity, DEFAULT_TAX_PERCENT)
        : round(getTaxAmountbyTotalPrice(totalPrice, DEFAULT_TAX_PERCENT), TOTAL_AMT_PRECISION);

      newItem[taxProp] = taxAmount;
      newItem.TotalPrice = totalPrice;
      newItem.TotalPriceWithTax = isGrossPriceEnabled ? priceAfterVat : totalPrice + taxAmount;
      newItem.PriceWithDisTax = isGrossPriceEnabled ? totalPrice : totalPrice + taxAmount;

      // Add the item to the `context``
      setItem(newItem);
    }
    // When an item is scanned more than once, from the 2nd time onwards increment the Qty
    else {
      const updatedItem = { ...matchingItem };
      updatedItem.Quantity = parseFloat(matchingItem.Quantity) + 1;

      // Calc. the Tax & Total Price based on the Qty
      const totalPrice = isGrossPriceEnabled
        ? getTotalPrice(updatedItem.Quantity, Price, Discount)
        : round(getTotalPrice(updatedItem.Quantity, Price, Discount), TOTAL_AMT_PRECISION);
      const taxAmount = isGrossPriceEnabled
        ? getTaxAmountbyTotalGrossPrice(Price, updatedItem.Quantity, DEFAULT_TAX_PERCENT)
        : round(getTaxAmountbyTotalPrice(totalPrice, DEFAULT_TAX_PERCENT), TOTAL_AMT_PRECISION);
      const priceAfterVat = getTotalPrice(1, Price, Discount);

      updatedItem[taxProp] = taxAmount;
      updatedItem.TotalPrice = totalPrice;
      updatedItem.TotalPriceWithTax = isGrossPriceEnabled ? priceAfterVat : totalPrice + taxAmount;
      updatedItem.isNew = false;

      //Update the item in the `context`
      updateItem(matchingIndex, updatedItem);
    }
  }
};
