import React, { useContext, useEffect, useState } from "react";
import { Button, Input, TabContent, Table, TabPane } from "reactstrap";
import { produce } from "immer";
import { Trash2 } from "react-feather";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { systemCurrency, currencySymbols } from "../../../../config/config";
import { roundPrice } from "views/common-utils/calculations.util";
import { getTimYardItems, getTimYardItemsinView } from "../../../../helper/items-helper";

const TimYardTransTable = ({
  className,
  itemCode,
  warehouseCode,
  closeModal,
  timyardTran,
  setTimYardTran,
  timYardTrans,
  setTimYardTrans,
  isEditQuotation,
  isQuotation,
  docNum = "",
  isNew,
  ViewOnly,
}) => {
  //const TimYardTransTable = ({ className, itemCode, warehouseCode, closeModal, timyardTran, setTimYardTran, timYardTrans, setTimYardTrans, isEditQuotation, docNum = "", isNew, ViewOnly }) => {
  const [timyardTran1, setTimYardTran1] = useState([]);
  const [popoverOpen, setPopoverOpen] = useState([]);
  const [warningMessages, setWarningMessages] = useState({});

  const togglePopOver = (key) => {
    const isOpen = [];
    if (!popoverOpen[key]) {
      isOpen[key] = true;
    }
    setPopoverOpen(isOpen);
  };

  // const handleDelete = async(id) => {
  //   deleteParkedTrx(id);
  //   const trxs = await getParkedTrxs();
  //   setParkedTrxs(trxs);
  //   closeModal();
  // }

  const handleNoPcsChange = (key, item, value) => {
    console.log("KeyValue", key);
    const updatedTrans = [...timyardTran1];
    updatedTrans[key].U_NoOfPcs = value;

    // Prevent negative values
    if (value < 0) {
      setWarningMessages((prev) => ({
        ...prev,
        [key]: "Value cannot be negative!",
      }));
      return; // stop if negative
    }

    // Prevent values greater than AvailablePieces
    if (value > parseFloat(updatedTrans[key].U_AvlPcs) && !isQuotation) {
      //if (value > parseFloat(updatedTrans[key].U_AvlPcs)) {
      setWarningMessages((prev) => ({
        ...prev,
        [key]: `Qty exceeds available pieces (${item.U_AvlPcs})`,
      }));
      return; // stop if exceeds
    }

    // If valid, clear warning
    setWarningMessages((prev) => ({
      ...prev,
      [key]: "",
    }));

    // Recalculate dependent fields like BalancePieces, BalanceAvailQty
    // updatedTrans[key].BalancePieces = updatedTrans[key].AvailablePieces - value; // Example formula, adjust as needed
    // updatedTrans[key].BalanceAvailQty = updatedTrans[key].AvlQty - value; // Example formula, adjust as needed

    updatedTrans[key].U_SelQty =
      value *
      (updatedTrans[key].U_Height / 1000) *
      (updatedTrans[key].U_Width / 1000) *
      updatedTrans[key].U_Length;
    //updatedTrans[key].AvailablePieces = (updatedTrans[key].AvlQty / (updatedTrans[key].Height/1000) * (updatedTrans[key].Width/1000) * updatedTrans[key].Length);
    updatedTrans[key].U_BalPcs = updatedTrans[key].U_AvlPcs - value;
    updatedTrans[key].U_BalAvlQty = updatedTrans[key].U_AvlQty - updatedTrans[key].U_SelQty;

    // Round and format the values to 3 decimal places
    updatedTrans[key].U_SelQty = updatedTrans[key].U_SelQty.toFixed(5); // or Number(updatedTrans[key].SelectedQty).toFixed(3)
    updatedTrans[key].U_BalPcs = updatedTrans[key].U_BalPcs.toFixed(5);
    updatedTrans[key].U_BalAvlQty =
      updatedTrans[key].U_BalAvlQty.toFixed(5) == 0.0
        ? "0.00000"
        : updatedTrans[key].U_BalAvlQty.toFixed(5);

    console.log("updatedTrans[key].U_BalAvlQty", updatedTrans[key].U_BalAvlQty);

    setTimYardTran(updatedTrans);
    //setTimYardTrans(updatedTrans);
    setTimYardTrans((prev) => ({
      ...prev,
      [item.ItemCode]: updatedTrans,
    }));
  };

  const handleResume = (id) => {
    closeModal();
  };

  const convertOSBSArrayToBatchItems = (data, itemCode) => {
    if (!Array.isArray(data)) return [];

    return data.map((item) => ({
      ...item,
      // Ensure all fields are present and formatted correctly
      // If the item does not have a specific field, use a default value or empty string
      ItemCode: itemCode || "", // Apply itemCode to each object
      DocEntry: item.DocEntry,
      U_Batch: item.U_Batch,
      U_Width: item.U_Width,
      U_Height: item.U_Height,
      U_Length: Number(item.U_Length)?.toFixed(6), // convert number to string with 6 decimals
      U_NoOfPcs: item.U_NoOfPcs,
      U_AvlQty: Number(item.U_AvlQty)?.toFixed(6), // convert number to string with 6 decimals
      U_SelQty: Number(item.U_SelQty)?.toFixed(6), // convert number to string with 6 decimals
      U_AvlPcs: item.U_AvlPcs?.toString(), // convert number to string
      U_BalPcs: item.U_BalPcs,
      U_BalAvlQty: item.U_BalAvlQty,
    }));
  };

  useEffect(() => {
    const fetchData = async () => {
      console.log("Getting TimYardItems for itemCode:", timYardTrans);
      const hasData =
        timYardTrans &&
        Object.values(timYardTrans).some((val) => {
          const arr = Array.isArray(val) ? val : [val];
          return arr.some((item) => item.ItemCode === itemCode);
        });

      console.log("hasData", hasData);

      if (hasData) {
        console.log("Item already exists:", itemCode);

        // 🔹 Just filter existing entry for this ItemCode
        const filtered = timYardTrans[itemCode]?.filter((item) => item.ItemCode === itemCode) || [];

        // update local state
        setTimYardTran(filtered);
        setTimYardTran1(filtered);
        // update global state
        setTimYardTrans((prev) => ({
          ...prev,
          [itemCode]: filtered,
        }));
      } else if (isNew) {
        // 🔹 Case 2: New transaction
        const trxs = await getTimYardItems(itemCode, warehouseCode, isQuotation);
        //const trxs = await getTimYardItems(itemCode, warehouseCode);
        const batchItems = convertOSBSArrayToBatchItems(trxs, itemCode);

        // setTimYardTran((prev) => ({
        //   ...prev,
        //   [itemCode]: batchItems,
        // }));
        setTimYardTran(batchItems);
        setTimYardTran1(batchItems);

        setTimYardTrans((prev) => ({
          ...prev,
          [itemCode]: batchItems,
        }));
      } else {
        // 🔹 Case 3: ViewOnly / Edit from docNum
        const trxs = await getTimYardItemsinView(docNum, itemCode);
        const batchItems = convertOSBSArrayToBatchItems(trxs?.SBS1Collection, itemCode);

        // setTimYardTran((prev) => ({
        //   ...prev,
        //   [itemCode]: batchItems,
        // }));
        setTimYardTran(batchItems);
        setTimYardTran1(batchItems);

        setTimYardTrans((prev) => ({
          ...prev,
          [itemCode]: batchItems,
        }));
      }
    };

    fetchData();
  }, []);

  const columns = [
    "#",
    "Item",
    "Batch",
    "Avl. Qty",
    "Width",
    "Height",
    "Length",
    "No of Pcs",
    "Selected Qty",
    "Avl. Pcs",
    "Bal. Pcs",
    "Bal Avl Qty",
  ];
  return (
    <div className={"table-fixed-head " + className}>
      <Table size="sm" responsive className="align-items-center table-flush">
        <thead className="thead-light">
          <tr className="border-top-secondary">
            {columns.map((col) => (
              <th className="f-light">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.isArray(timyardTran1) && timyardTran1.length > 0 ? (
            timyardTran1
              .filter((item) => (isQuotation ? true : item.U_AvlQty > 0))
              .map((trx, filteredKey) => {
                //timyardTran1.filter(item => item.U_AvlQty > 0).map((trx, filteredKey) => {
                // Find the correct index in the original array
                //console.log("Filtered Key: ", filteredKey);
                //console.log("Original Array: ", timyardTran);
                const originalIndex = timyardTran1.findIndex(
                  (item) => item.U_Batch === trx.U_Batch,
                );
                return (
                  <tr key={trx.U_Batch}>
                    <td>{filteredKey + 1}</td>
                    <td>{trx.ItemCode}</td>
                    <td>{trx.U_Batch}</td>
                    <td>{trx.U_AvlQty}</td>
                    <td>{trx.U_Width}</td>
                    <td>{trx.U_Height}</td>
                    <td>{trx.U_Length}</td>
                    <td>
                      {/* {trx.NoPcs} */}
                      <Input
                        size="sm"
                        type="number"
                        value={trx.U_NoOfPcs}
                        onChange={(e) => handleNoPcsChange(originalIndex, trx, e.target.value)}
                        style={{ margin: "5px" }}
                        disabled={ViewOnly} // always disabled
                      />
                      {warningMessages[originalIndex] && (
                        <small className="text-danger">{warningMessages[originalIndex]}</small>
                      )}
                    </td>
                    <td>{trx.U_SelQty}</td>
                    <td>{trx.U_AvlPcs ? parseFloat(trx.U_AvlPcs).toFixed(5) : 0}</td>
                    <td>{trx.U_BalPcs}</td>
                    <td>{trx.U_BalAvlQty}</td>
                    {/* <td>
                  <h5 className="mb-0 text-primary">
                    {trx.data.isOneTimeCustomer ?
                      trx.data.oneTimeCustomerDetails.U_CODCntName
                      ? trx.data.oneTimeCustomerDetails.U_CODCntName
                      : trx.data.oneTimeCustomerDetails.CardName 
                    : trx.data.customer.CardName ? trx.data.customer.CardName : "Not Selected" 
                    }
                  </h5>
                </td>
                <td>
                  { trx.data.isOneTimeCustomer ?
                      trx.data.oneTimeCustomerDetails.U_CODTlePhone
                      ? trx.data.oneTimeCustomerDetails.U_CODTlePhone
                      : "-"
                    : trx.data.customer.Cellular ? trx.data.customer.Cellular : "-"}
                </td>
                <td className= "text-center">
                  {currencySymbols[systemCurrency]} {roundPrice(trx.data.parkedTransaction.TotalAmount)}
                </td>
                <td style={{width:"30%", whiteSpace: "unset"}}>
                  {trx.data.parkedTransaction.parkReason}
                </td>
                <td>
                  <Button size="sm" color="success" onClick={() => handleResume(trx.parkedTransactionId)}>Resume</Button>
                </td>
                <td>
                  <span onClick={() => handleDelete(trx.parkedTransactionId)}>
                    <FontAwesomeIcon icon={faTrashCan} size={"lg"} className="text-danger cursor-pointer" />
                  </span>
                </td> */}
                  </tr>
                );
              })
          ) : (
            <tr>
              <td colSpan={columns.length} className="text-warning">
                No records found!
              </td>
            </tr>
          )}
        </tbody>
        <tfoot></tfoot>
      </Table>
    </div>
  );
};

export default TimYardTransTable;
