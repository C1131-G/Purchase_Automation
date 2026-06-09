import React, { useState, useContext, useEffect } from "react";
import { UserMinus, UserPlus } from "react-feather";
import { Card, CardBody, CardHeader, Form, Input } from "reactstrap";
import HeaderCard from "../../../components/Headers/HeaderCardSmall.js";
import DebouncedInput from "../../../components/DebouncedInput.js";
import { ReturnsContext } from "./context/ReturnsContext.js";

import {
  getTaxAmount,
  getTotalPrice,
  getNetUnitPrice,
  getTaxAmountbyTotalGrossPrice,
  getNetUnitPricebyRoundTotalPrice,
} from "../../common-utils/calculations.util.js";
import { isGrossPriceEnabled } from "config/config.js";

const ScanItems = () => {
  const {
    returnsItems,
    setReturnsItems,
    deleteReturnsItem,
    updateReturnsItem,
    getTotalQuantity,
    getTaxableAmount,
    getTotalTax,
    getTotalAmount,
    taxProp,
    setTaxProp,
  } = useContext(ReturnsContext);

  const [scannedBarCode, setScannedBarCode] = useState("");
  const [warningMsg, setWarningMsg] = useState("");

  // TODO need to move this to Grid.js & use it in the ItemsTable.js too
  const handleScan = (itemCode) => {
    console.log("Scanned itemCode: ", itemCode);
    setWarningMsg("");

    const matchingIndex = returnsItems.findIndex((item) => item.ItemCode === itemCode);
    if (matchingIndex > -1) {
      const matchingItem = returnsItems[matchingIndex];

      const updatedItem = {
        ...matchingItem,
        // isSelectedForReturn: true,
        // Quantity: 1,
        // InvoiceQuantity: matchingItem.Quantity
      };

      // console.log("matchingItem.Quantity: ", matchingItem.Quantity);
      // console.log("matchingItem.InvoiceQuantity: ", matchingItem.InvoiceQuantity);

      // Select the item for Return only when the Remaining Qty is > 0. When a Return Request was not
      // created for the row, the Remaining Qty will be null
      if (matchingItem.U_RemainingOpenQty === null || matchingItem.U_RemainingOpenQty > 0) {
        // When the item is scanned for the 1st time
        if (!matchingItem.isSelectedForReturn) {
          updatedItem.isSelectedForReturn = true;
          updatedItem.Quantity = 1;
          // set the Invoice Qty or Remaining Qty (if available) to this prop.
          updatedItem.InvoiceQuantity =
            matchingItem.U_RemainingOpenQty === null
              ? matchingItem.Quantity
              : matchingItem.U_RemainingOpenQty;
          updatedItem.InvoiceTax = matchingItem[taxProp];

          const netUnitPrice = isGrossPriceEnabled
            ? getNetUnitPricebyRoundTotalPrice(matchingItem.Price, matchingItem.Discount, 0)
            : getNetUnitPrice(matchingItem.Price, 0, matchingItem.TaxPercent);
          updatedItem.NetUnitPrice = netUnitPrice; // Price per Qty after Discount & Tax
        }
        // From the 2nd time onwards increment the Qty by 1 as long as it doesnt exceed the Qty in the Invoice
        else if (parseFloat(matchingItem.Quantity) < parseFloat(matchingItem.InvoiceQuantity)) {
          updatedItem.Quantity = parseFloat(matchingItem.Quantity) + 1;
        } else {
          setWarningMsg("Item already selected for return!");
          return;
        }
      }

      // Update Taxable Amount & Tax based on the Qty scanned for Returns
      const taxAmount = isGrossPriceEnabled
        ? getTaxAmountbyTotalGrossPrice(
            matchingItem.Price,
            updatedItem.Quantity,
            matchingItem.TaxPercent,
          )
        : getTaxAmount(
            updatedItem.Quantity,
            matchingItem.Price,
            matchingItem.Discount,
            matchingItem.TaxPercent,
          );
      const totalPrice = getTotalPrice(
        updatedItem.Quantity,
        matchingItem.Price,
        matchingItem.Discount,
      ); // Remove `taxAmount` from Total
      const priceAfterVat = getTotalPrice(1, matchingItem.Price, matchingItem.Discount);
      updatedItem[taxProp] = taxAmount;
      updatedItem.TotalPrice = totalPrice;
      updatedItem.TotalPriceWithTax = isGrossPriceEnabled ? priceAfterVat : totalPrice + taxAmount; // Total Price with Tax
      updateReturnsItem(matchingIndex, updatedItem);
    } else {
      setWarningMsg("Item is unavailable in the Invoice!");
    }
  };

  useEffect(() => {
    if (scannedBarCode) {
      handleScan(scannedBarCode);
      setScannedBarCode("");
    }
  }, [scannedBarCode]);

  return (
    <Card className="shadow">
      <HeaderCard title={"Item"} className="border-0" />
      <CardBody className="pt-0">
        <div className="flex-nowrap">
          <DebouncedInput
            bsSize="sm"
            readOnly={false}
            // style={{ width: 80 + "%" }}
            className={"form-control text-gray-dark"} //display-4
            id="barCode"
            placeholder={"Scan a product to return"}
            value={scannedBarCode}
            onChange={setScannedBarCode}
            delayInMilliseconds={0} // Delay not required for Returns as there is no API call
            invalid={warningMsg ? true : false}
          />
          {warningMsg && <small className="text-warning">{warningMsg}</small>}
        </div>
      </CardBody>
    </Card>
  );
};

export default ScanItems;
