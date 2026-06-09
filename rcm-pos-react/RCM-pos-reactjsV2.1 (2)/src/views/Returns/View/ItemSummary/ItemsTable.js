import React, { useContext, useEffect, useState } from "react";
import { Input, Table, CustomInput } from "reactstrap";
import { Trash2 } from "react-feather";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { systemCurrency, currencySymbols } from "../../../../config/config.js";
import { round } from "../../../../config/util.js";
import { PRECISION, TAX_PROPS } from "../../../../config/config.js";

import TaxDropdown from "../../../components/TaxDropdown";
import { ReturnsContext } from "./../context/ReturnsContext";

const ItemsTable = () => {
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

  const [currency, setCurrency] = useState(systemCurrency); // If required, change this via `props`

  // Set Tax Prop based on the currency
  useEffect(() => {
    if (currency === systemCurrency) setTaxProp(TAX_PROPS.TaxLocal);
    else setTaxProp(TAX_PROPS.TaxForeign);
  }, []);

  //"Tax%", "Tax Amount", "Discount", "Taxable",
  const columns = ["#", "Invoice#", "Item", "Quantity", "Unit Price", "Return Reason", "Total"];

  // console.log("returnsItems: ", returnsItems);
  return (
    <div className="table-fixed-head">
      {" "}
      {/** recent-table  */}
      <Table size="sm" responsive className="align-items-center table-flush">
        <colgroup>
          <col style={{ width: "2%" }} /> {/** # */}
          <col style={{ width: "35%" }} /> {/* Item Name */}
          <col style={{ width: "15%" }} /> {/* Quantity */}
          <col style={{ width: "14%" }} /> {/* WH Code */}
          <col style={{ width: "10%" }} /> {/* Price */}
          <col style={{ width: "10%" }} /> {/* Tax Amt */}
          <col style={{ width: "10%" }} /> {/* Discount */}
          <col style={{ width: "10%" }} /> {/* Total Price */}
        </colgroup>
        <thead className="thead-light">
          <tr className="border-top-secondary">
            {columns.map((col) => (
              <th>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.isArray(returnsItems) &&
            returnsItems.length > 0 &&
            returnsItems.map((item, key) => (
              <tr key={item.LineNum}>
                <td>{key + 1}</td>
                {/* <td style={{ width: "40%", whiteSpace: "unset" }}> */}
                {/* <td style={{ width: "50%", wordWrap: "break-word" }}> */}
                <td>{item.U_ReturnedInvoiceNos}</td>
                <td>
                  <h5 className="mb-0 text-primary">
                    {/* <Link to={`${process.env.PUBLIC_URL}/app/ecommerce/orderhistory`}>{item.title}</Link> */}
                    {item.ItemName}
                  </h5>
                  <span className="font-light">Code : {item.ItemCode}</span>&emsp;|&emsp;
                  <span className="font-light font-weight-800">WH: {item.WhsCode}</span>
                </td>
                <td>{item.Quantity}</td>
                <td className="font-weight-500">
                  {currencySymbols[systemCurrency]} {round(item.Price, PRECISION)}
                </td>
                <td>{item.U_ReturnReason}</td>
                {/* <td>{currencySymbols[systemCurrency]} {round(item[taxProp], PRECISION)}</td>
              <td>{round(item.Discount, PRECISION)} %</td> */}
                {/* <td>{currencySymbols[systemCurrency]} {round(item.LineTotal, PRECISION)}</td> */}
                <td>
                  {currencySymbols[systemCurrency]}{" "}
                  {round(parseFloat(item.LineTotal) + parseFloat(item[taxProp]), PRECISION)}
                </td>
              </tr>
            ))}
        </tbody>
        <tfoot>
          <tr className="font-weight-700">
            <td colSpan={2}></td>
            <td className="text-right">Total Qty</td>
            <td>{getTotalQuantity()}</td>
            <td colSpan={2} className="text-right text-primary">
              Total Value
            </td>
            <td className="text-primary">
              {currencySymbols[systemCurrency]} {getTotalAmount()}
            </td>
            {/* <td colSpan={2} className="text-right">Taxable Amount</td>
            <td>{currencySymbols[systemCurrency]} {getTaxableAmount()}</td> */}
          </tr>
          {/* <tr>
            <td colSpan={7} className="text-right">Total Tax</td>
            <td>{currencySymbols[systemCurrency]} {getTotalTax()}</td>
          </tr>
          <tr className="font-weight-700 text-primary">
            <td colSpan={7} className="text-right">Total Value</td>
            <td>{currencySymbols[systemCurrency]} {getTotalAmount()}</td>
          </tr> */}
        </tfoot>
      </Table>
    </div>
  );
};

export default ItemsTable;
