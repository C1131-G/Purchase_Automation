import React, { useEffect, useState, useContext } from "react";
import { Col, Row } from "reactstrap";

import ItemSummary from "./ItemSummary";
import FilterCard from "./../../components/FilterCard.js";
import InvoiceList from "./InvoiceList.js";
import HeaderRecordDetailsCard from "../../components/POS/HeaderRecordDetailsCard.js";
import SalesActions from "./SalesActions.js";
import CounterInfo from "../../components/POS/CounterInfo";

import { UserPermissionsContext } from "../../../contexts/UserPermissionsContext";
import { ViewSalesContext } from "./context/ViewSalesContext.js";

const Grid = () => {
  const { userSessionLog } = useContext(UserPermissionsContext);
  const { selectedRecord } = useContext(ViewSalesContext);

  const initialDate = new Date();
  initialDate.setDate(initialDate.getDate() - 7);

  const [filters, setFilters] = useState({
    fromDate: initialDate,
    toDate: new Date(),
    docStatus: "",
    // customerCode: "",
    userCode: userSessionLog?.userName,
    locationName: userSessionLog?.storeLocation,
    salesEmployeeCode: "",
    searchKey: "",
    // pageNum: 1,
    // pageSize: 20
  });

  // useEffect(() => {
  //   if(selectedRecord) {
  //     console.log("selectedRecord: ", selectedRecord);
  //   }
  // }, [selectedRecord]);

  return (
    <>
      {/* Display the Invoice list when no Invoice is selected yet */}
      {!selectedRecord ? (
        <Col md="12">
          {" "}
          {/** xxl="10" */}
          <Row>
            <Col md="10" className="mb-2 mt-2">
              <FilterCard
                // getRecords={getInvoices}
                // setRecords={setInvoices}
                placeholder="Search by Invoice#, COD & One-Time Customer Names or Comments"
                recordType={"Invoice"}
                filters={filters}
                enableLocationBasedSearch={false}
                setFilters={setFilters}
              />
            </Col>
            <Col md="2">
              <SalesActions />
            </Col>
          </Row>
          <Row>
            <Col md="12">
              <InvoiceList filters={filters} />
            </Col>
          </Row>
        </Col>
      ) : (
        <Col md="12">
          <Row>
            <Col md="10">
              <Row>
                <Col md="6">
                  <HeaderRecordDetailsCard
                    selectedRecord={selectedRecord}
                    dateLabel={"Inv. Date"}
                  />
                </Col>
                <Col md="6">
                  <CounterInfo />
                </Col>
              </Row>
              <Row>
                <Col md="12" className="mt-3">
                  <ItemSummary />
                </Col>
              </Row>
            </Col>
            <Col md="2">
              <SalesActions />
            </Col>
          </Row>
        </Col>
      )}
    </>
  );
};

export default Grid;
