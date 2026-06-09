import React, { useEffect, useRef, useState, useContext } from "react";
import { Col, Row, Card, CardBody, Button } from "reactstrap";

import ItemSummary from "./ItemSummary";
import FilterCard from "./../../components/FilterCard.js";
import ScanItems from "./ScanItems.js";
import InvoiceList from "./InvoiceList.js";
import HeaderRecordDetailsCard from "../../components/POS/HeaderRecordDetailsCard.js";
import ReturnsActions from "../ReturnsActions.js";
import CounterInfo from "../../components/POS/CounterInfo";
import HeaderUploadAttachmentCard from "../../components/POS/HeaderUploadAttachmentCard";

import { UserPermissionsContext } from "../../../contexts/UserPermissionsContext";
import { ReturnsContext } from "./context/ReturnsContext.js";

const Grid = () => {
  const { userSessionLog } = useContext(UserPermissionsContext);
  const { selectedInvoice, setAttachmentFile } = useContext(ReturnsContext);
  const attachmentRef = useRef();

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
  //   if(selectedInvoice) {
  //     console.log("selectedInvoice: ", selectedInvoice);
  //   }
  // }, [selectedInvoice]);

  const handleFileSelect = (file) => {
    setAttachmentFile(file); // Send to context
  };

  const handleAttachmentReset = () => {
    if (attachmentRef.current) {
      attachmentRef.current.clearFile();
    }
  };

  return (
    <>
      {/* Display the Invoice list when no Invoice is selected yet */}
      {!selectedInvoice ? (
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
              <ReturnsActions />
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
                <Col md="4">
                  <HeaderRecordDetailsCard
                    selectedRecord={selectedInvoice}
                    dateLabel={"Inv. Date"}
                  />
                </Col>
                <Col md="4">
                  <ScanItems />
                </Col>
                <Col md="4">
                  <CounterInfo />
                </Col>
              </Row>
              <Row>
                <Col md="12" className="mb-2 mt-2">
                  <HeaderUploadAttachmentCard onFileSelect={handleFileSelect} ref={attachmentRef} />
                </Col>
              </Row>
              <Row>
                <Col md="12" className="mt-3">
                  <ItemSummary onSubmitSuccess={handleAttachmentReset} />
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
