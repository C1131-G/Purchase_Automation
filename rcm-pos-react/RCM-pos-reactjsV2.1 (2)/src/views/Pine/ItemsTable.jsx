import React, { useContext, useEffect } from "react";
import { Input, TabContent, Table, TabPane } from "reactstrap";
import { Trash2 } from "react-feather";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { getTotalPrice } from "../../util/misc";
import { currencySymbol } from "../../config/config";

import { LeaseContext } from "./context/LeaseContext";

const ItemsTable = () => {
  const {
    salesItems,
    deleteSalesItem,
    updateSalesItem,
    getTotalQuantity,
    getTaxableAmount,
    getTaxPercentage,
    getTotalTax,
    getTotalInvoiceAmount,
  } = useContext(LeaseContext);

  const handleDelete = (key) => {
    deleteSalesItem(key);
  };

  // const handleChange = (event, key, property) => {
  //   updateSalesItem(key, property, event.target.value);
  // }

  const handleQuantityChange = (index, item, event) => {
    console.log(`handleQuantityChange:  index: ${index} qty: ${parseFloat(event.target.value)}`);
    console.log(`handleQuantityChange:  item: ${JSON.stringify(item)}`);
    const quantity = parseFloat(event.target.value);
    if (quantity > 0) {
      // const totalPrice = getTotalPrice(quantity, 10, 2); //Added for TESTing
      const totalPrice = getTotalPrice(quantity, item.Price, item.Discount);
      const updatedItem = {
        ...item,
        Quantity: quantity,
        TotalPrice: totalPrice,
      };
      updateSalesItem(index, updatedItem);
    }
  };

  /** TODO: Need to remove this. Added only for testing purpose */
  const { setSalesItem } = useContext(LeaseContext);

  useEffect(() => {
    const totalPrice = getTotalPrice(1, 10, 2);
    setSalesItem({
      ItemCode: "AAAS0009",
      ItemName: "Assembly Packet for 1000/11 Assembly",
      Quantity: 1,
      Price: 10,
      Discount: 2,
      TotalPrice: totalPrice,
      InvntryUom: "NOS",
    });
    setSalesItem({
      ItemCode: "AAAS0010",
      ItemName: "Assembly Packet for 100 - 250kVA Assembly Ph2",
      Quantity: 1,
      Price: 10,
      Discount: 2,
      TotalPrice: totalPrice,
      InvntryUom: "NOS",
    });
  }, []);
  /** TODO: Need to remove this. Added only for testing purpose */

  const columns = ["#", "Item", "Quantity", "Unit Price", "Discount", "Total", "Del."];
  return (
    <div className="table-fixed-head">
      {" "}
      {/** recent-table  */}
      <Table size="sm" responsive className="align-items-center table-flush">
        <colgroup>
          <col style={{ width: "5%" }} /> {/** # */}
          <col style={{ width: "30%" }} /> {/* Item Name */}
          <col style={{ width: "15%" }} /> {/* Quantity */}
          <col style={{ width: "10%" }} /> {/* Price */}
          <col style={{ width: "15%" }} /> {/* Discount */}
          <col style={{ width: "15%" }} /> {/* Total Price */}
          <col style={{ width: "10%" }} />
        </colgroup>
        <thead className="thead-light">
          <tr className="border-top-secondary">
            {columns.map((col) => (
              <th>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {salesItems.map((item, key) => (
            <tr key={item.ItemCode}>
              <td>{key + 1}</td>
              {/* <td style={{ width: "40%", whiteSpace: "unset" }}> */}
              {/* <td style={{ width: "50%", wordWrap: "break-word" }}> */}
              <td>
                <h5 className="mb-0 text-primary">
                  {/* <Link to={`${process.env.PUBLIC_URL}/app/ecommerce/orderhistory`}>{item.title}</Link> */}
                  {item.ItemName}
                </h5>
                <span className="font-light">Item Code : {item.ItemCode}</span>
              </td>
              <td>
                <Input
                  size="sm"
                  type="number"
                  value={item.Quantity}
                  onChange={(e) => handleQuantityChange(key, item, e)}
                />
                {/* {item.Quantity} */}
              </td>
              <td className="font-weight-500">${item.Price}</td>
              {/* <td className="f-w-500">
                <div className={`recent-status font-${item.statusCode}`}>
                  <SvgIcon iconId={item.iconName} className="me-1" />
                  {item.status}
                </div>
              </td> */}
              <td>{item.Discount} %</td>
              <td>
                {currencySymbol}
                {item.TotalPrice}
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
            <td className="text-end">Total Qty</td>
            <td>{getTotalQuantity()}</td>
            <td></td>
            <td colSpan={1} className="text-end">
              Taxable Amount
            </td>
            <td>
              {currencySymbol}
              {getTaxableAmount()}
            </td>
          </tr>
          <tr>
            <td></td>
            <td className="text-end">Tax</td>
            <td>{getTaxPercentage()}%</td>
            <td></td>
            <td colSpan={1} className="text-right">
              Total Tax
            </td>
            <td>
              {currencySymbol}
              {getTotalTax()}
            </td>
          </tr>
          <tr className="font-weight-700 text-primary">
            <td colSpan={5} className="text-right">
              Total Invoice Value
            </td>
            <td>
              {currencySymbol}
              {getTotalInvoiceAmount()}
            </td>
          </tr>
        </tfoot>
      </Table>
    </div>
  );
};

export default ItemsTable;
