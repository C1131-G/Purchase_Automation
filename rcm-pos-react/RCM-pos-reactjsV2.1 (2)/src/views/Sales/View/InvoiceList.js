import React, { useContext, useState } from "react";
import StatusColumn from "../../../components/Columns/StatusColumn";
import ToastMessage from "../../../components/ToastMessage";
import RecordsTableWithInfinityScroll from "../../components/RecordsTableWithInfinityScroll";
// import RecordsTableWithFilter from "../../components/RecordsTableWithFilter";
import { displayModes, statusColors, recordStatusList, PRECISION } from "../../../config/config.js";
import { formatDate, round } from "../../../config/util.js";
import { getInvoices } from "../../../helper/invoice.js";
import HeaderCardWithSubtitle from "../../../components/Headers/HeaderCardWithSubtitle";

import { ViewSalesContext } from "./context/ViewSalesContext";

const InvoiceList = ({ filters }) => {
  const { setSelectedRecord } = useContext(ViewSalesContext);

  const [displayMode, setDisplayMode] = useState(displayModes.VIEW);
  const [reloadData, setReloadData] = useState(false);
  const [recordCount, setRecordCount] = useState(0);
  const [successMsg, setSuccessMsg] = useState("");
  const [warningMsg, setWarningMsg] = useState("");

  const headerColumns = [
    { label: "#" },
    { label: "Invoice#", sortField: "DocNum" },
    { label: "Date", sortField: "DocDate" },
    { label: "Customer", sortField: "CardName" },
    { label: "Sales Person", sortField: "SalesPersonName" },
    { label: "Invoice Amount", sortField: "DocTotal" },
    { label: "Discount", sortField: "TotalDiscount" },
    { label: "Location", sortField: "U_Location" },
    { label: "Status", sortField: "DocStatus" },
    { label: "Comments", sortField: "Comments" },
  ];

  const getStatusName = (statusCode) => {
    const status = recordStatusList.find((ele) => ele.code === statusCode);
    return status.name;
  };

  const TableContent = ({ record, index }) => (
    <tr>
      <td>{index + 1}</td>
      {/* <td className="font-weight-800">{record.DocNum}</td> */}
      <th className="mb-0 text-sm" scope="row">
        {/* Check if the Invoice was created in the current user's location */}
        {record.U_Location === filters.locationName ? (
          <a
            className="text-dark-gray cursor-pointer"
            style={{ textDecoration: "underline" }}
            onClick={() => setSelectedRecord(record)}
          >
            {record.DocNum}
          </a>
        ) : (
          // Block users from opening Invoices that were created from other Locations
          <span className="text-dark-gray">{record.DocNum}</span>
        )}
        {/** <i className="fas fa-arrow-up text-success mr-3" />{" "}**/}
      </th>
      <td>{formatDate(record.DocDate, "MMMM D, YYYY")}</td>
      <td>
        <h5 className="text-info font-weight-600 mb-0">
          {record.U_CODCntName ? record.U_CODCntName : record.CardName}
        </h5>
        <span className="text-dark-gray">
          Customer Code : <span className="font-weight-600">{record.CardCode}</span>
        </span>
      </td>
      <td>{record.SalesPersonName}</td>
      <td>
        {record.DocCur} {round(record.DocTotal, PRECISION)}
      </td>
      <td>
        {record.DocCur} {round(record.TotalDiscount, PRECISION)}
      </td>
      <td className="font-weight-600 text-info">{record.U_Location}</td>
      <td>
        <StatusColumn status={getStatusName(record.DocStatus)} />
      </td>
      <td style={{ whiteSpace: "unset" }}>{record.Comments}</td>
    </tr>
  );

  return (
    <>
      <div className="pb-1">
        <HeaderCardWithSubtitle
          title={"Invoices"}
          subTitle={"Click on an Invoice# to view items."}
          rightContent={
            recordCount ? (
              <h5 className="font-dark">
                Count: <span className="text-primary font-weight-800">{recordCount}</span>
              </h5>
            ) : (
              ""
            )
          }
        />
      </div>
      <RecordsTableWithInfinityScroll
        recordType="Invoice"
        queryKey="invoiceList"
        headerColumns={headerColumns}
        displayMode={displayMode}
        reloadData={reloadData}
        setRecordCount={setRecordCount}
        getRecordHelper={getInvoices}
        setDisplayMode={setDisplayMode}
        setSuccessMsg={setSuccessMsg}
        setWarningMsg={setWarningMsg}
        tableContent={TableContent}
        filters={filters}
      />

      {successMsg && <ToastMessage type={statusColors.SUCCESS} message={successMsg} />}
      {warningMsg && <ToastMessage type={statusColors.WARNING} message={warningMsg} />}
    </>
  );
};

export default InvoiceList;
