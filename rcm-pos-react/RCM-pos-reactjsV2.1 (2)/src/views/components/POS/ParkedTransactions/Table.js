import React, { useContext, useEffect, useState } from "react";
import { Button, Input, TabContent, Table, TabPane } from "reactstrap";
import { produce } from "immer";
import { Trash2 } from "react-feather";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan } from "@fortawesome/free-solid-svg-icons";
import ItemsPopover from "./ItemsPopover";
import { systemCurrency, currencySymbols } from "../../../../config/config";
import { roundPrice } from "views/common-utils/calculations.util";

const ParkedTransactionsTable = ({
  getParkedTrxs,
  deleteParkedTrx,
  resumeTrx,
  closeModal,
  className,
}) => {
  const [parkedTrxs, setParkedTrxs] = useState([]);
  const [popoverOpen, setPopoverOpen] = useState([]);

  const togglePopOver = (key) => {
    const isOpen = [];
    if (!popoverOpen[key]) {
      isOpen[key] = true;
    }
    setPopoverOpen(isOpen);
  };

  const handleDelete = async (id) => {
    deleteParkedTrx(id);
    const trxs = await getParkedTrxs();
    setParkedTrxs(trxs);
    closeModal();
  };

  const handleResume = (id) => {
    resumeTrx(id);
    closeModal();
  };

  useEffect(() => {
    const fetchData = async () => {
      const trxs = await getParkedTrxs();
      setParkedTrxs(trxs);
    };
    fetchData();
  }, []);

  const columns = [
    "#",
    "Ref No",
    "Counter Id",
    "Customer Name",
    "Contact#",
    "Item Details",
    "Total",
    "Reason",
    "Resume",
    "Del.",
  ];
  return (
    <div className={"table-fixed-head " + className}>
      <Table size="md" responsive className="align-items-center table-flush">
        <thead className="thead-light">
          <tr className="border-top-secondary">
            {columns.map((col) => (
              <th className="f-light">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.isArray(parkedTrxs) && parkedTrxs.length > 0 ? (
            parkedTrxs.map((trx, key) => (
              <tr key={trx.data.customer.CardName ? trx.data.customer.CardName : key}>
                <td>{key + 1}</td>
                <td>{trx.transactionRefNum}</td>
                <td>{trx.storeCounterId}</td>
                <td>
                  <h5 className="mb-0 text-primary">
                    {trx.data.isOneTimeCustomer
                      ? trx.data.oneTimeCustomerDetails.U_CODCntName
                        ? trx.data.oneTimeCustomerDetails.U_CODCntName
                        : trx.data.oneTimeCustomerDetails.CardName
                      : trx.data.customer.CardName
                        ? trx.data.customer.CardName
                        : "Not Selected"}
                  </h5>
                </td>
                <td>
                  {trx.data.isOneTimeCustomer
                    ? trx.data.oneTimeCustomerDetails.U_CODTlePhone
                      ? trx.data.oneTimeCustomerDetails.U_CODTlePhone
                      : "-"
                    : trx.data.customer.Cellular
                      ? trx.data.customer.Cellular
                      : "-"}
                </td>
                <td className="font-weight-500">
                  <ItemsPopover
                    index={key}
                    label="Items Details"
                    title={"Items"}
                    isOpen={popoverOpen[key]}
                    items={trx.data.salesItems}
                    togglePopOver={togglePopOver}
                  />
                </td>
                <td className="text-center">
                  {currencySymbols[systemCurrency]}{" "}
                  {roundPrice(trx.data.parkedTransaction.TotalAmount)}
                </td>
                <td style={{ width: "30%", whiteSpace: "unset" }}>
                  {trx.data.parkedTransaction.parkReason}
                </td>
                <td>
                  <Button
                    size="sm"
                    color="success"
                    onClick={() => handleResume(trx.parkedTransactionId)}
                  >
                    Resume
                  </Button>
                </td>
                <td>
                  <span onClick={() => handleDelete(trx.parkedTransactionId)}>
                    <FontAwesomeIcon
                      icon={faTrashCan}
                      size={"lg"}
                      className="text-danger cursor-pointer"
                    />
                  </span>
                </td>
              </tr>
            ))
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

export default ParkedTransactionsTable;
