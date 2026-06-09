import React, { useEffect, useState, useContext } from "react";
import { Col, Row } from "reactstrap";

import ItemSummary from "./ItemSummary";
import FilterCard from "../../components/FilterCard.js";
import SalesQuotationList from "./SalesQuotationList.js";
import HeaderRecordDetailsCard from "../../components/POS/HeaderRecordDetailsCard.js";
import SalesQuotationActions from "./SalesQuotationActions.js";
import CounterInfo from "../../components/POS/CounterInfo";

import { UserPermissionsContext } from "../../../contexts/UserPermissionsContext";
import { ViewSalesQuotationContext } from "./context/ViewSalesQuotationContext.js";
import HeaderDateTermsCard from "../../components/POS/HeaderDateTermsCard";

const Grid = () => {
  const { userSessionLog } = useContext(UserPermissionsContext);
  const { selectedRecord } = useContext(ViewSalesQuotationContext);

  const initialDate = new Date();
  initialDate.setDate(initialDate.getDate() - 7);

  const [filters, setFilters] = useState({
    fromDate: initialDate,
    toDate: new Date(),
    docStatus: "O",
    // customerCode: "",
    userCode: userSessionLog?.userName,
    locationName: userSessionLog?.storeLocation,
    salesEmployeeCode: "",
    searchKey: "",
    // pageNum: 1,
    // pageSize: 20
  });

  return (
    <>
      {/* Display the Sales Quotation list when no Sales Quotation is selected yet */}
      {!selectedRecord ? (
        <Col md="12">
          {" "}
          {/** xxl="10" */}
          <Row>
            <Col md="10" className="mb-2 mt-2">
              <FilterCard
                // getRecords={getInvoices}
                // setRecords={setInvoices}
                placeholder="Search by Sales Quotation#, COD & One-Time Customer Names or Comments"
                recordType={"Sales Quotation"}
                filters={filters}
                enableLocationBasedSearch={false}
                setFilters={setFilters}
              />
            </Col>
            <Col md="2">
              <SalesQuotationActions />
            </Col>
          </Row>
          <Row>
            <Col md="12">
              <SalesQuotationList filters={filters} />
            </Col>
          </Row>
        </Col>
      ) : (
        <Col md="12">
          <Row>
            <Col md="12">
              <Row>
                <Col md="4">
                  <HeaderRecordDetailsCard
                    selectedRecord={selectedRecord}
                    dateLabel={"Posting Date"}
                  />
                </Col>
                <Col md="4">
                  {" "}
                  <HeaderDateTermsCard selectedRecord={selectedRecord} />
                </Col>
                <Col md="4">
                  <CounterInfo />
                </Col>
              </Row>
              <Row>
                <Col md="10" className="mt-3">
                  <ItemSummary />
                </Col>
                <Col md="2" className="mt-3">
                  <SalesQuotationActions />
                </Col>
              </Row>
            </Col>
          </Row>
        </Col>
      )}
    </>
  );
};

export default Grid;
