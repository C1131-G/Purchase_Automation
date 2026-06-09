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
  getDiscountAmount,
  getNetUnitPrice,
  getNetUnitPricebyRoundTotalPrice,
  getTaxAmount,
  getTaxAmountbyTotalGrossPrice,
  getTaxAmountbyTotalPrice,
  getTotalPrice,
  roundPrice,
} from "../../../common-utils/calculations.util.js";
import {
  systemCurrency,
  currencySymbols,
  PRECISION,
  TAX_PROPS,
  TOTAL_AMT_PRECISION,
  timYardItemGroups,
  isGrossPriceEnabled,
} from "../../../../config/config";
import { round } from "../../../../config/util";

import TaxDropdown from "../../../components/TaxDropdown";
import { SalesContext } from "./../context/SalesContext";
import StockAvailabilityPopover from "../../../components/StockAvailabilityPopover";
import TimYardItemsModal from "../../../components/POS/TimYardItemsModel/index.js";

const ItemsTable = () => {
  const {
    salesItems,
    setSalesItem,
    deleteSalesItem,
    updateSalesItem,
    getTotalQuantity,
    getTaxableAmount,
    getTotalTax,
    getTotalInvoiceAmount,
    setTimYardTransactions,
    timYardTransaction,
    taxProp,
    setTaxProp,
    salesHeader,
    isEditQuotation,
    sqDocNum,
    validateQuantityAgainstStock,
    setWarningMsg,
  } = useContext(SalesContext);

  const [currency, setCurrency] = useState(systemCurrency); // If required, change this via `props`
  const [openTimYardItemModal, setOpenTimYardItemModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [timYardTrans, setTimYardTrans] = useState([]);
  const [timYardTran, setTimYardTran] = useState([]);
  const [selectedRowKey, setSelectedRowKey] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const handleDelete = (key) => {
    deleteSalesItem(key);
  };

  const handleCommentChange = (index, item, comment) => {
    const updatedItem = {
      ...item,
      FreeText: comment,
    };
    updateSalesItem(index, updatedItem);
  };

  const closeModal = () => {
    //setPaymentInfo({});
    setOpenTimYardItemModal(false);
    console.log("Updated TimYardTrans:", timYardTran);
    const item = salesItems[selectedRowKey];
    setTimYardTransactions(item.ItemCode, timYardTran);

    const itemsArray = Object.values(timYardTrans).flatMap(
      (val) => (Array.isArray(val) ? val : [val]), // if already array, keep; if single object, wrap
    );

    const batches = itemsArray.filter((batch) => batch.ItemCode === item.ItemCode);

    const sumselectedQty = batches.reduce((total, item) => {
      // Convert item.NoPcs to a number (floating-point) before adding
      const selectedQty = parseFloat(item.U_SelQty);
      // If parseFloat returns NaN (not a number), default to 0
      return total + (isNaN(selectedQty) ? 0 : selectedQty);
    }, 0);

    const sumSelectedPcs = batches.reduce((total, item) => {
      // Convert item.NoPcs to a number (floating-point) before adding
      const selectedPcs = parseFloat(item.U_NoOfPcs);
      // If parseFloat returns NaN (not a number), default to 0
      return total + (isNaN(selectedPcs) ? 0 : selectedPcs);
    }, 0);

    let batchNumbers = [];
    batches.forEach((batch, batchKey) => {
      let reqItem = {};
      if (batch.U_SelQty > 0) {
        reqItem.BatchNumber = batch.U_Batch; //NOTE: the prop is 'BatchNumber'
        reqItem.AvailableQuantity = batch.U_AvlQty;
        reqItem.Quantity = batch.U_SelQty;
        reqItem.BaseLineNumber = selectedRowKey;
        reqItem.DocumentLinesBinAllocations = [
          {
            BinCode: item.BinCode,
            BinAbsEntry: item.BinAbsEntry,
            OnHandQty: parseFloat(batch.U_AvlQty),
            Quantity: batch.U_SelQty,
          },
        ];
        batchNumbers.push(reqItem);
      }
    });
    // const updatedItem = {
    //   ...item,
    //   Quantity: sumselectedQty.toFixed(3),
    //   BatchNumbers:batchNumbers,
    // };
    // updateSalesItem(selectedRowKey, updatedItem);
    console.log(
      `handleQuantityChange:  index: ${selectedRowKey} qty: ${parseFloat(sumselectedQty.toFixed(5))}`,
    );
    console.log(`handleQuantityChange:  item: ${JSON.stringify(item)}`);
    if (sumselectedQty.toFixed(5) > 0) {
      const totalPrice = round(
        getTotalPrice(sumselectedQty.toFixed(5), item.Price, item.Discount),
        TOTAL_AMT_PRECISION,
      ); // Remove `taxAmount` from Total
      const priceAfterVat = getTotalPrice(1, item.Price, item.Discount);
      const taxAmount = isGrossPriceEnabled
        ? round(getTaxAmountbyTotalPrice(totalPrice, item.TaxPercent), TOTAL_AMT_PRECISION)
        : round(getTaxAmountbyTotalPrice(totalPrice, item.TaxPercent), TOTAL_AMT_PRECISION);
      const discountAmount = getDiscountAmount(
        sumselectedQty.toFixed(5),
        item.Price,
        item.Discount,
        item.TaxPercent,
      );
      const netUnitPrice = isGrossPriceEnabled
        ? getNetUnitPricebyRoundTotalPrice(item.Price, item.Discount, 0)
        : getNetUnitPricebyRoundTotalPrice(item.Price, item.Discount, item.TaxPercent);
      const updatedItem = {
        ...item,
        Quantity: sumselectedQty.toFixed(5),
        DiscountAmount: discountAmount, // only for user ref.
        [taxProp]: taxAmount,
        NetUnitPrice: netUnitPrice, // Price per Qty after Discount & Tax
        TotalPrice: totalPrice,
        TotalPriceWithTax: isGrossPriceEnabled ? priceAfterVat : totalPrice + taxAmount,
        BatchNumbers: batchNumbers,
        Pcs: sumSelectedPcs.toFixed(5),
      };
      updateSalesItem(selectedRowKey, updatedItem);
    }
    console.log("Updated TimYardTrans1:", timYardTrans);
  };

  /**
   * Returns the sum of the Quantities of all the Bin Allocations under a Batch/Serial
   * @param {Array} documentLinesBinAllocations
   */
  const getBinAllocationTotal = (documentLinesBinAllocations) => {
    let total = 0; //, lineQty = 0;
    console.log("documentLinesBinAllocations", documentLinesBinAllocations);
    if (
      documentLinesBinAllocations &&
      Array.isArray(documentLinesBinAllocations) &&
      documentLinesBinAllocations.length
    ) {
      documentLinesBinAllocations.forEach((line) => {
        //NOTE: When a Bin is newly added its Qty will be 'blank' this causes the total to
        //bcome NaN, so added below validation
        // lineQty = parseInt(line.Quantity);
        total = total + (isNaN(parseFloat(line.SelectedQty)) ? 0 : parseFloat(line.SelectedQty));
        console.log("calctotal", documentLinesBinAllocations);
      });
    }
    console.log("total", documentLinesBinAllocations);
    return total;
  };

  const handleOpenTimYardItemModal = (item, key) => {
    console.log("Open Tim Yard Model", item);
    setModalData({
      itemCode: item.ItemCode,
      warehouseCode: item.WhsCode,
      docNum: item.DocNum || "", // Pass DocNum if available
      isNew: item.isNew,
    });
    setSelectedRowKey(key);
    setSelectedItem(item);
    setOpenTimYardItemModal(true);
  };

  // const handleChange = (event, key, property) => {
  //   updateSalesItem(key, property, event.target.value);
  // }

  /**
   * Sets the selected Tax to the item
   * @param {String} propName
   * @param {Object} tax
   * @param {Number} index
   */
  const handleTaxChange = (propName, tax, index) => {
    console.log("handleTaxChange - Code:", tax);
    let taxCode = "",
      taxRate = "";
    if (tax) {
      taxCode = tax.Code;
      taxRate = round(tax.Rate, PRECISION);
    }

    const item = salesItems[index];
    const totalPrice = round(
      getTotalPrice(item.Quantity, item.Price, item.Discount),
      TOTAL_AMT_PRECISION,
    ); // Removed `taxAmount` from total
    const priceAfterVat = getTotalPrice(1, item.Price, item.Discount);
    const taxAmount = round(getTaxAmountbyTotalPrice(totalPrice, taxRate), TOTAL_AMT_PRECISION);
    const netUnitPrice = isGrossPriceEnabled
      ? getNetUnitPricebyRoundTotalPrice(item.Price, item.Discount, 0)
      : getNetUnitPricebyRoundTotalPrice(item.Price, item.Discount, taxRate);
    const updatedItem = {
      ...salesItems[index],
      [propName]: taxCode,
      TaxPercent: taxRate,
      [taxProp]: taxAmount,
      NetUnitPrice: netUnitPrice, // Price per Qty after Discount & Tax
      TotalPrice: totalPrice,
      TotalPriceWithTax: isGrossPriceEnabled ? priceAfterVat : totalPrice + taxAmount,
    };
    updateSalesItem(index, updatedItem);
  };

  const handleQuantityChange = async (index, item, quantity) => {
    console.log(`handleQuantityChange:  index: ${index} qty: ${parseFloat(quantity)}`);
    console.log(`handleQuantityChange:  item: ${JSON.stringify(item)}`);

    if (quantity > 0) {
      // Validate quantity against available stock
      const validation = await validateQuantityAgainstStock(
        item.ItemCode,
        item.WhsCode,
        quantity,
        item.InvntItem,
      );
      if (!validation?.isValid) {
        setWarningMsg(validation.message);
        return;
      } else {
        setWarningMsg("");
      }

      const totalPrice = round(
        getTotalPrice(quantity, item.Price, item.Discount),
        TOTAL_AMT_PRECISION,
      ); // Remove `taxAmount` from Total
      const priceAfterVat = getTotalPrice(1, item.Price, item.Discount);
      const taxAmount = isGrossPriceEnabled
        ? round(getTaxAmountbyTotalPrice(totalPrice, item.TaxPercent), TOTAL_AMT_PRECISION)
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
      updateSalesItem(index, updatedItem);
    }
  };

  const handleDiscountChange = (index, item, discount) => {
    // Disabling this check as per customer request
    // if(discount > -1) {
    const totalPrice = round(
      getTotalPrice(item.Quantity, item.Price, discount),
      TOTAL_AMT_PRECISION,
    ); // Removed `taxAmount` from total
    const priceAfterVat = getTotalPrice(1, item.Price, discount);
    const taxAmount = isGrossPriceEnabled
      ? round(getTaxAmountbyTotalPrice(totalPrice, item.TaxPercent), TOTAL_AMT_PRECISION)
      : round(getTaxAmountbyTotalPrice(totalPrice, item.TaxPercent), TOTAL_AMT_PRECISION);
    const discountAmount = getDiscountAmount(item.Quantity, item.Price, discount, item.TaxPercent);
    const netUnitPrice = isGrossPriceEnabled
      ? getNetUnitPricebyRoundTotalPrice(item.Price, discount, 0)
      : getNetUnitPricebyRoundTotalPrice(item.Price, discount, item.TaxPercent);
    const updatedItem = {
      ...item,
      Discount: discount,
      DiscountAmount: discountAmount,
      [taxProp]: taxAmount,
      NetUnitPrice: netUnitPrice, // Price per Qty after Discount & Tax
      TotalPrice: totalPrice, // Price for all the Qtys after Discount
      TotalPriceWithTax: isGrossPriceEnabled ? priceAfterVat : totalPrice + taxAmount, // Price for all the Qtys after Discount + Tax
    };
    updateSalesItem(index, updatedItem);
    // }
  };

  // Set Tax Prop based on the currency
  useEffect(() => {
    if (currency === systemCurrency) setTaxProp(TAX_PROPS.TaxLocal);
    else setTaxProp(TAX_PROPS.TaxForeign);
  }, []);

  // const columns = ["#", "Item", "Quantity", "Unit Price", "Tax%", "Tax Amount",
  //   "Discount%", "Discount", "Taxable", "Total", "Del."];

  /* Hiding Unit Price, Tax, Taxable Amount info as per client request */
  const columns = [
    "#",
    "Item",
    "Quantity",
    "Discount%",
    "Discount",
    "Net Unit Price",
    "Total",
    "Comments",
    "Del.",
  ];

  return (
    <div className="table-fixed-head">
      {" "}
      {/** recent-table  */}
      <Table size="sm" responsive className="align-items-center table-flush">
        <colgroup>
          <col style={{ width: "2%" }} /> {/** # */}
          <col style={{ width: "18%" }} /> {/* Item Name */}
          <col style={{ width: "8%" }} /> {/* Quantity */}
          {/* <col style={{ width: "10%" }} /> Unit Price */}
          {/* <col style={{ width: "10%" }} /> Tax Code */}
          {/* <col style={{ width: "10%" }} /> Tax Amt */}
          <col style={{ width: "8%" }} /> {/* Discount % */}
          <col style={{ width: "8%" }} /> {/* Discount Amount */}
          <col style={{ width: "10%" }} /> {/* Net Unit Price */}
          <col style={{ width: "10%" }} /> {/* Total Price */}
          <col style={{ width: "28%" }} /> {/* Comments */}
          <col style={{ width: "4%" }} /> {/* Delete */}
        </colgroup>
        <thead className="thead-light">
          <tr className="border-top-secondary">
            {columns.map((col) => (
              <th>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.isArray(salesItems) &&
            salesItems.map((item, key) => (
              <tr
                key={item.ItemCode + item.WhsCode}
                style={{
                  backgroundColor:
                    item.PriceListName?.includes("Lock Price") ||
                    item.FCCCItem ||
                    item.DiscApplied === "Y"
                      ? "rgb(6 177 186 / 15%)" // primary color light
                      : "transparent",
                }}
              >
                <td>{key + 1}</td>
                {/* <td style={{ width: "40%", whiteSpace: "unset" }}> */}
                {/* <td style={{ width: "50%", wordWrap: "break-word" }}> */}
                <td className="text-left" style={{ whiteSpace: "unset", width: "50%" }}>
                  <h5 className="mb-0 text-primary">
                    {/* <Link to={`${process.env.PUBLIC_URL}/app/ecommerce/orderhistory`}>{item.title}</Link> */}
                    {item.ItemName}
                  </h5>
                  <span className="font-light">Code : {item.ItemCode}</span>&emsp;|&emsp;
                  <span className="font-light font-weight-800">Warehouse: {item.WhsCode}</span>
                  <br />
                  <span
                    id={"availableQuantityPopOverBtn" + key}
                    className="text-success text-underline cursor-pointer font-weight-800"
                  >
                    Stock
                  </span>
                  <StockAvailabilityPopover
                    itemCode={item.ItemCode}
                    targetId={`availableQuantityPopOverBtn${key}`}
                  />
                  {/* <br />
                <p className="text-sm font-light font-weight-800">
                  Warehouse: {item.WhsCode}
                </p>
                 */}
                </td>
                {/* <td style={{ display: "flex", alignItems: "center", paddingRight: "0rem",    paddingLeft: "0rem" }}> */}
                <td>
                  <div style={{ position: "relative", display: "inline-block", minWidth: "110px" }}>
                    <InputGroup size="sm">
                      <Input
                        size="sm"
                        type="number"
                        value={item.Quantity}
                        onChange={(e) => handleQuantityChange(key, item, e.target.value)}
                        //style={{ margin: "5px" }}
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
                  {/* {console.log("item.ItmsGrpName",item)}
                { timYardItemGroups.includes(item.ItmsGrpName)  ? (
                  <span onClick={() => handleOpenTimYardItemModal(item, key)}>
                    <FontAwesomeIcon icon={faCubesStacked} size={"2x"} className="text-primary cursor-pointer" />
                  </span>
                ) : null} */}
                </td>
                {/* Hiding Unit Price, Tax, Taxable Amount info as per client request */}
                {/* <td className="font-weight-500">
                {currencySymbols[systemCurrency]} {round(item.Price, PRECISION)}
              </td> */}
                {/* <td className="f-w-500">
                <div className={`recent-status font-${item.statusCode}`}>
                  <SvgIcon iconId={item.iconName} className="me-1" />
                  {item.status}
                </div>
              </td> */}
                {/* <td>{item.VatGroup}</td> */}
                {/* Disable Tax Group edit option
               <td>
                <TaxDropdown
                  rowIndex={key}
                  value={item.VatGroup ? item.VatGroup : null}
                  className="mr-2"
                  removeLabel={true}
                  removeMargin={true}
                  returnSelectedRecord={true}
                  propName="VatGroup"
                  handleChange={handleTaxChange}
                  // style={{ width: "70%" }}
                  disabled={false}
                />
              </td> */}
                {/* <td>{item.TaxPercent ? item.TaxPercent : "0.00"} %</td>
              <td>{currencySymbols[systemCurrency]} {round(item[taxProp], PRECISION)}</td> */}
                <td>
                  <div style={{ position: "relative", display: "inline-block" }}>
                    <InputGroup size="sm">
                      <Input
                        size="sm"
                        // style={{ width: "70%" }}
                        type="number"
                        value={item.Discount}
                        onChange={(e) => handleDiscountChange(key, item, e.target.value)}
                      />
                      {/* Overlay the % symbol on the input field */}
                      {/* <span
                    style={{ position: "absolute", right: "6px", top: "50%",
                      transform: "translateY(-50%)", // color: "#6c757d"
                    }}
                  >
                    %
                  </span> */}
                      {/* This takes up too much space that the textbox becomes to small to type the value. */}
                      <InputGroupAddon addonType="append">
                        <InputGroupText>%</InputGroupText>
                      </InputGroupAddon>
                    </InputGroup>
                  </div>
                </td>
                <td>
                  {currencySymbols[systemCurrency]} {round(item.DiscountAmount, PRECISION)}
                </td>
                {/* Price per `quantity` after the tax is added and discount subtracted */}
                <td>
                  {currencySymbols[systemCurrency]} {round(item.NetUnitPrice, TOTAL_AMT_PRECISION)}
                </td>
                {/* <td>{currencySymbols[systemCurrency]} {round(item.TotalPrice, PRECISION)}</td> */}
                <td>
                  {currencySymbols[systemCurrency]}{" "}
                  {isGrossPriceEnabled
                    ? round(item.TotalPriceWithTax * item.Quantity, TOTAL_AMT_PRECISION)
                    : round(item.TotalPriceWithTax, TOTAL_AMT_PRECISION)}
                </td>
                <td style={{ minWidth: "200px", width: "28%" }}>
                  <FormGroup className="mt-1 mb-3">
                    <Input
                      size="sm"
                      type="textarea"
                      value={item.FreeText}
                      rows="1"
                      onChange={(e) => handleCommentChange(key, item, e.target.value)}
                    />
                  </FormGroup>
                </td>
                <td>
                  <span onClick={() => handleDelete(key)}>
                    <FontAwesomeIcon
                      icon={faTrashCan}
                      size={"2x"}
                      className="text-danger cursor-pointer"
                    />
                  </span>
                  {/* <Trash2
                  id={`delete-item-${key}`}
                  size={25}
                  className="pb-1 text-danger cursor-pointer"
                  onClick={() => handleDelete(key)}
                /> */}
                  {/* <i className="fa fa-trash text-red" /> */}
                </td>
              </tr>
            ))}
        </tbody>
        <tfoot>
          <tr className="font-weight-700">
            <td></td>
            <td className="text-right">Total Qty</td>
            <td>{getTotalQuantity()}</td>
            <td></td>
            <td colSpan={2} className="font-weight-700 text-primary text-right">
              Total Invoice Value
            </td>
            <td className="font-weight-700 text-primary">
              {currencySymbols[systemCurrency]} {roundPrice(getTotalInvoiceAmount(PRECISION))}
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
          timYardTrans={timYardTransaction} // Pass the timYardTrans data
          setTimYardTrans={setTimYardTrans} // Pass the state updater function
          isEditQuotation={isEditQuotation} // Pass fromSalesQuotation state
          //isQuotation={false} // Since this is Sales Order
          isNew={modalData.isNew}
          ViewOnly={false} // Pass ViewOnly prop
        />
      )}
    </div>
  );
};

export default ItemsTable;
