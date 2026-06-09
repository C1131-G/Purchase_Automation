import React, { useContext, useEffect, useState } from "react";
import { Input, InputGroup, InputGroupAddon, InputGroupText, Table, CustomInput } from "reactstrap";
import { getTaxAmountbyTotalPrice, roundPrice } from "../../../common-utils/calculations.util.js";
import { systemCurrency, currencySymbols, TAX_PROPS } from "../../../../config/config.js";
import { ReturnsContext } from "./../context/ReturnsContext";
import ReturnReasonsDropdown from "../../../components/POS/ReturnReasonsDropdown.js";

const ItemsTable = ({ setWarningMsg }) => {
  const { returnsItems, updateReturnsItem, getTotalQuantity, getTotalAmount, taxProp, setTaxProp } =
    useContext(ReturnsContext);

  const [currency] = useState(systemCurrency);

  /* ============================================================
     1. ITEM SELECTION LOGIC
  ============================================================ */
  const handleItemSelection = (index, item, event) => {
    setWarningMsg("");
    const { checked } = event.target;
    const updatedItem = { ...item };

    if (checked && (item.U_RemainingOpenQty === null || item.U_RemainingOpenQty > 0)) {
      updatedItem.isSelectedForReturn = true;

      const quantity = item.U_RemainingOpenQty ?? item.Quantity;
      updatedItem.Quantity = quantity;
      updatedItem.InvoiceQuantity = quantity;

      const baseUnitPrice = parseFloat(item.LineTotal) / parseFloat(item.Quantity) || 0;

      updatedItem.GRNChargingPercent = 0;
      updatedItem.VEPUnitPrice = baseUnitPrice;
      updatedItem.DiscountAmount = 0; // Reset charging amount
      updatedItem.TotalPrice = baseUnitPrice * quantity;
      updatedItem[taxProp] = getTaxAmountbyTotalPrice(updatedItem.TotalPrice, item.TaxPercent);
    } else {
      // FIX 1: Resetting EVERYTHING including tax when unchecked
      updatedItem.isSelectedForReturn = false;
      updatedItem.GRNChargingPercent = 0;
      updatedItem.VEPUnitPrice = 0;
      updatedItem.DiscountAmount = 0;
      updatedItem.TotalPrice = 0;
      updatedItem[taxProp] = 0; // Tax is now safely reset
    }
    updateReturnsItem(index, updatedItem);
  };

  /* ============================================================
     2. GRN CHARGING LOGIC
  ============================================================ */
  const handleGRNChargingChange = (index, item, grnValue) => {
    const grnPercent = parseFloat(grnValue) || 0;
    const quantity = parseFloat(item.Quantity) || 0;
    const baseUnitPrice = parseFloat(item.LineTotal) / parseFloat(item.InvoiceQuantity) || 0;

    const grnAmountPerUnit = baseUnitPrice * (grnPercent / 100);
    const vepUnitPrice = baseUnitPrice + grnAmountPerUnit;

    const totalPrice = vepUnitPrice * quantity;
    const taxAmount = getTaxAmountbyTotalPrice(totalPrice, item.TaxPercent);

    // FIX 2: Store the total GRN charging amount in DiscountAmount variable
    const grnAmountTotal = grnAmountPerUnit * quantity;

    const updatedItem = {
      ...item,
      GRNChargingPercent: grnValue,
      VEPUnitPrice: vepUnitPrice,
      TotalPrice: totalPrice,
      DiscountAmount: grnAmountTotal, // Saved here for clean JSX
      [taxProp]: taxAmount,
    };

    updateReturnsItem(index, updatedItem);
  };

  const handleQuantityChange = (index, item, event) => {
    const quantity = parseFloat(event.target.value) || 0;
    if (quantity > 0 && quantity <= item.InvoiceQuantity) {
      const updatedItem = { ...item, Quantity: quantity };
      handleGRNChargingChange(index, updatedItem, updatedItem.GRNChargingPercent || 0);
    }
  };

  const handleChange = (index, item, event) => {
    const { name, value } = event.target;
    if (value) {
      const updatedItem = { ...item, [name]: value };
      updateReturnsItem(index, updatedItem);
    }
  };

  useEffect(() => {
    if (currency === systemCurrency) setTaxProp(TAX_PROPS.TaxLocal);
    else setTaxProp(TAX_PROPS.TaxForeign);
  }, [currency, setTaxProp]);

  const columns = [
    "",
    "#",
    "Item",
    "Quantity",
    "Original Disc %",
    "GRN CHARGING %",
    "Disc Amount",
    "Reason",
    "VEP UNIT PRICE",
    "TOTAL VIP",
  ];

  return (
    <div className="table-fixed-head">
      <Table size="sm" responsive className="align-items-center table-flush">
        <thead className="thead-light">
          <tr className="border-top-secondary">
            {columns.map((col, idx) => (
              <th key={idx}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.isArray(returnsItems) &&
            returnsItems.length > 0 &&
            returnsItems.map((item, key) => (
              <tr key={item.LineNum} className={!item.isSelectedForReturn ? "text-muted" : ""}>
                <td>
                  {/* FIX 3: Restored safety check to show "NA" if no qty remains */}
                  {item.U_RemainingOpenQty === null || item.U_RemainingOpenQty > 0 ? (
                    <CustomInput
                      id={"invoiceItem" + key}
                      type="checkbox"
                      checked={item.isSelectedForReturn || false}
                      onChange={(e) => handleItemSelection(key, item, e)}
                    />
                  ) : (
                    "NA"
                  )}
                </td>
                <td>{key + 1}</td>
                <td>
                  <h5
                    className={`mb-0 ${!item.isSelectedForReturn ? "text-muted" : "text-primary"}`}
                  >
                    {item.ItemName}
                  </h5>
                  <small>
                    Code: {item.ItemCode} | WH: {item.WhsCode}
                  </small>
                </td>
                <td>
                  <Input
                    size="sm"
                    type="number"
                    value={item.Quantity}
                    onChange={(e) => handleQuantityChange(key, item, e)}
                    disabled={!item.isSelectedForReturn}
                  />
                </td>
                <td>
                  <InputGroup size="sm">
                    <Input value={Number(item.DiscountPercent || 0).toFixed(2)} disabled />
                    <InputGroupAddon addonType="append">
                      <InputGroupText>%</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                </td>
                <td>
                  <InputGroup size="sm">
                    <Input
                      type="number"
                      value={item.GRNChargingPercent || ""}
                      onChange={(e) => handleGRNChargingChange(key, item, e.target.value)}
                      disabled={!item.isSelectedForReturn}
                    />
                    <InputGroupAddon addonType="append">
                      <InputGroupText>%</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                </td>
                {/* Cleaned up calculation - using stored value now */}
                <td>
                  {currencySymbols[systemCurrency]} {Number(item.DiscountAmount || 0).toFixed(2)}
                </td>
                <td>
                  <ReturnReasonsDropdown
                    index={key}
                    item={item}
                    name="U_ReturnReason"
                    value={item.U_ReturnReason}
                    handleChange={handleChange}
                    disabled={!item.isSelectedForReturn}
                  />
                </td>
                <td>
                  {currencySymbols[systemCurrency]} {Number(item.VEPUnitPrice || 0).toFixed(2)}
                </td>
                <td>
                  {currencySymbols[systemCurrency]}{" "}
                  {Number(
                    parseFloat(item.TotalPrice || 0) + parseFloat(item[taxProp] || 0),
                  ).toFixed(2)}
                </td>
              </tr>
            ))}
        </tbody>
        <tfoot>
          <tr className="font-weight-700">
            <td colSpan={2}></td>
            <td className="text-right">Total Qty</td>
            <td>{Number(getTotalQuantity() || 0).toFixed(2)}</td>
            <td colSpan={5} className="text-right">
              Total Value
            </td>
            <td>
              {currencySymbols[systemCurrency]} {Number(getTotalAmount() || 0).toFixed(2)}
            </td>
          </tr>
          <tr className="font-weight-700 text-primary">
            <td colSpan={9} className="text-right">
              Rounded Value
            </td>
            <td>
              {currencySymbols[systemCurrency]} {roundPrice(getTotalAmount(), 2)}
            </td>
          </tr>
        </tfoot>
      </Table>
    </div>
  );
};

export default ItemsTable;
