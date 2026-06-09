import React, { useEffect, useState, useContext } from "react";
import { Col, Row } from "reactstrap";

import ItemSummary from "./ItemSummary";
import FilterCard from "./../../components/FilterCard.js";
import ReturnsList from "./ReturnsList.js";
import HeaderRecordDetailsCard from "../../components/POS/HeaderRecordDetailsCard.js";
import ReturnsActions from "../ReturnsActions.js";
import CounterInfo from "../../components/POS/CounterInfo";

import { UserPermissionsContext } from "../../../contexts/UserPermissionsContext";
import { ReturnsContext } from "./context/ReturnsContext";

const Grid = () => {
  const { userSessionLog } = useContext(UserPermissionsContext);
  const { selectedReturns, setSelectedReturns } = useContext(ReturnsContext);

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

  // useEffect(() => {
  //   if(selectedReturns) {
  //     console.log("selectedReturns: ", selectedReturns);
  //   }
  // }, [selectedReturns]);

  return (
    <>
      {/* Display the Returns list when no Returns is selected yet */}
      {!selectedReturns ? (
        <Col md="12">
          {" "}
          {/** xxl="10" */}
          <Row>
            <Col md="10" className="mb-2 mt-2">
              <FilterCard
                // getRecords={getReturnss}
                // setRecords={setReturnss}
                placeholder="Search by Return Req.#, COD & One-Time Customer Names or Comments"
                recordType={"Returns"}
                filters={filters}
                enableLocationBasedSearch={false}
                setFilters={setFilters}
              />
            </Col>
            <Col md="2">
              <ReturnsActions />
            </Col>
          </Row>
          <Row>
            <Col md="12">
              <ReturnsList filters={filters} />
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
                    selectedRecord={selectedReturns}
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
              <ReturnsActions />
            </Col>
          </Row>
        </Col>
      )}
    </>
  );
};

export default Grid;
