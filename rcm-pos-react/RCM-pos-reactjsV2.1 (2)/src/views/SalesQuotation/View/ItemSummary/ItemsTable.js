import React, { useContext, useEffect, useState } from "react";
import {
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  FormGroup,
  TabContent,
  Table,
  TabPane,
} from "reactstrap";
import { Trash2 } from "react-feather";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan, faCubesStacked } from "@fortawesome/free-solid-svg-icons";
import {
  systemCurrency,
  currencySymbols,
  timYardItemGroups,
  isGrossPriceEnabled,
  TOTAL_AMT_PRECISION,
} from "../../../../config/config.js";
import { round } from "../../../../config/util.js";
import { PRECISION, TAX_PROPS } from "../../../../config/config.js";

import { ViewSalesQuotationContext } from "../context/ViewSalesQuotationContext.js";
import { roundPrice } from "views/common-utils/calculations.util.js";
import { getTotalPrice } from "views/common-utils/calculations.util.js";
import { getTaxAmountbyTotalGrossPrice } from "views/common-utils/calculations.util.js";
import { getTaxAmountbyTotalPrice } from "views/common-utils/calculations.util.js";
import { getDiscountAmount } from "views/common-utils/calculations.util.js";
import { getNetUnitPricebyRoundTotalPrice } from "views/common-utils/calculations.util.js";
import { getSalesQuotationItems } from "helper/sales-quotation.js";
import TimYardItemsModal from "../../../components/POS/TimYardItemsModel/index.js";

const ItemsTable = () => {
  const {
    items,
    getTotalQuantity,
    getTotalSalesQuotationAmount,
    taxProp,
    setTaxProp,
    updateSalesQuotationItem,
    setTimYardTransactionsByItem,
  } = useContext(ViewSalesQuotationContext);

  const [currency, setCurrency] = useState(systemCurrency); // If required, change this via `props`
  const [openTimYardItemModal, setOpenTimYardItemModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [timYardTrans, setTimYardTrans] = useState([]);
  const [selectedRowKey, setSelectedRowKey] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [timYardTran, setTimYardTran] = useState([]);

  // Set Tax Prop based on the currency
  useEffect(() => {
    if (currency === systemCurrency) setTaxProp(TAX_PROPS.TaxLocal);
    else setTaxProp(TAX_PROPS.TaxForeign);
  }, []);

  const handleOpenTimYardItemModal = (item, key) => {
    console.log("Open Tim Yard Model", item);
    setModalData({
      itemCode: item.ItemCode,
      warehouseCode: item.WhsCode,
      docNum: item.DocNum || "", // Pass DocNum if available
    });
    setSelectedRowKey(key);
    setSelectedItem(item);
    setOpenTimYardItemModal(true);
  };

  const handleQuantityChange = (index, item, quantity) => {
    console.log(`handleQuantityChange:  index: ${index} qty: ${parseFloat(quantity)}`);
    console.log(`handleQuantityChange:  item: ${JSON.stringify(item)}`);
    if (quantity > 0) {
      const totalPrice = round(
        getTotalPrice(quantity, item.Price, item.Discount),
        TOTAL_AMT_PRECISION,
      ); // Remove `taxAmount` from Total
      const priceAfterVat = getTotalPrice(1, item.Price, item.Discount);
      const taxAmount = isGrossPriceEnabled
        ? getTaxAmountbyTotalGrossPrice(item.Price, quantity, item.TaxPercent)
        : round(getTaxAmountbyTotalPrice(totalPrice, item.TaxPercent), TOTAL_AMT_PRECISION);
      const discountAmount = getDiscountAmount(
        quantity,
        item.Price,
        item.Discount,
        item.TaxPercent,
      );
      const netUnitPrice = isGrossPriceEnabled
        ? getNetUnitPricebyRoundTotalPrice(item.Price, item.Discount, 0)
        : getNetUnitPricebyRoundTotalPrice(item.Price, item.Discount, item.TaxPercent);
      const updatedItem = {
        ...item,
        Quantity: quantity,
        DiscountAmount: discountAmount, // only for user ref.
        [taxProp]: taxAmount,
        NetUnitPrice: netUnitPrice, // Price per Qty after Discount & Tax
        TotalPrice: totalPrice,
        TotalPriceWithTax: isGrossPriceEnabled ? priceAfterVat : totalPrice + taxAmount,
      };
      updateSalesQuotationItem(index, updatedItem);
    }
  };

  const closeModal = () => {
    setOpenTimYardItemModal(false);
  };

  const columns = ["#", "Item", "Quantity", "Discount%", "Unit Price", "Total"];

  return (
    <div className="table-fixed-head">
      {" "}
      {/** recent-table  */}
      <Table size="sm" responsive className="align-items-center table-flush">
        <thead className="thead-light">
          <tr className="border-top-secondary">
            {columns.map((col) => (
              <th>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, key) => (
            <tr key={item.ItemCode + item.WhsCode}>
              <td>{key + 1}</td>
              {/* <td style={{ width: "40%", whiteSpace: "unset" }}> */}
              {/* <td style={{ width: "50%", wordWrap: "break-word" }}> */}
              <td className="text-left">
                <h5 className="mb-0 text-primary">
                  {/* <Link to={`${process.env.PUBLIC_URL}/app/ecommerce/orderhistory`}>{item.title}</Link> */}
                  {item.ItemName}
                </h5>
                <span className="font-light">Code : {item.ItemCode}</span>&emsp;|&emsp;
                <span className="font-light font-weight-800">Warehouse: {item.WhsCode}</span>
              </td>
              {/* <td>{item.Quantity}</td> */}
              <td>
                <div style={{ position: "relative", display: "inline-block" }}>
                  <InputGroup size="sm">
                    <Input
                      size="sm"
                      type="number"
                      value={item.Quantity}
                      onChange={(e) => handleQuantityChange(key, item, e.target.value)}
                    />
                    <InputGroupAddon addonType="append">
                      <InputGroupText>
                        {timYardItemGroups.includes(item.ItmsGrpName) ? (
                          <span
                            title="Timber Yard Batch selection"
                            onClick={() => handleOpenTimYardItemModal(item, key)}
                          >
                            <FontAwesomeIcon
                              icon={faCubesStacked}
                              size={"1x"}
                              className="text-primary cursor-pointer"
                            />
                          </span>
                        ) : null}
                      </InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                </div>
              </td>
              <td>{round(item.DiscountPercent, PRECISION)} %</td>
              <td className="font-weight-600">
                {currencySymbols[systemCurrency]}{" "}
                {round(parseFloat(item.Price), TOTAL_AMT_PRECISION)}
              </td>
              {/* Hiding Tax, Taxable Amount info as per client request */}
              {/* <td className="f-w-500">
                <div className={`recent-status font-${item.statusCode}`}>
                  <SvgIcon iconId={item.iconName} className="me-1" />
                  {item.status}
                </div>
              </td> */}
              {/* <td>{item.VatGroup}</td> */}
              {/* <td>{item.TaxPercent ? item.TaxPercent : "0.00"} %</td>
              <td>{currencySymbols[systemCurrency]} {round(item[taxProp], PRECISION)}</td> */}
              <td>
                {currencySymbols[systemCurrency]}{" "}
                {round(parseFloat(item.LineTotal) + parseFloat(item[taxProp]), TOTAL_AMT_PRECISION)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-weight-700">
            <td></td>
            <td className="text-right">Total Qty</td>
            <td>{getTotalQuantity()}</td>
            <td colSpan={2} className="font-weight-700 text-primary text-right">
              Total Sales Quotation Value
            </td>
            <td className="font-weight-700 text-primary">
              {currencySymbols[systemCurrency]}{" "}
              {roundPrice(getTotalSalesQuotationAmount(PRECISION))}
            </td>
            {/* <td colSpan={4} className="text-right">Taxable Amount</td> */}
            {/** text-end */}
            {/* <td>{currencySymbols[systemCurrency]} {getTaxableAmount()}</td> */}
          </tr>
          {/* <tr>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td colSpan={4} className="text-right">Total Tax</td>
            <td>{currencySymbols[systemCurrency]} {getTotalTax()}</td>
          </tr> */}
          {/* <tr className="font-weight-700 text-primary">
            <td colSpan={5} className="text-right">Total Invoice Value</td>
            <td>{currencySymbols[systemCurrency]} {getTotalInvoiceAmount(PRECISION)}</td>
          </tr> */}
        </tfoot>
      </Table>
      {openTimYardItemModal && modalData && (
        <TimYardItemsModal
          isOpen={openTimYardItemModal}
          closeModal={closeModal}
          itemCode={modalData.itemCode}
          whsCode={modalData.warehouseCode}
          docNum={modalData.docNum}
          timYardTran={timYardTran}
          setTimYardTran={setTimYardTran}
          timYardTrans={timYardTrans} // Pass the timYardTrans data
          setTimYardTrans={setTimYardTrans} // Pass the state updater function
          isEditQuotation={true} // Pass the isisEditQuotation prop
          isQuotation={true}
          isNew={false}
          ViewOnly={true} // Pass ViewOnly prop
        />
      )}
    </div>
  );
};

export default ItemsTable;
