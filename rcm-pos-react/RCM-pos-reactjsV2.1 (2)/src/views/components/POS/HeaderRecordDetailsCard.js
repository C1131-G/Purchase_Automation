import React from "react";
import { Card, CardBody, Row, Col } from "reactstrap";
import { formatDate } from "../../../config/util.js";

const HeaderRecordDetailsCard = ({ selectedRecord, dateLabel, compactView = true }) => {
  return (
    <>
      {compactView ? (
        <Card className="shadow">
          <CardBody className="text-sm">
            <div className="mb-2 row">
              <span className="text-gray col-md-3">Customer</span>&emsp;
              <span className="text-primary font-weight-700">
                :{" "}
                {selectedRecord.U_CODCntName
                  ? selectedRecord.U_CODCntName
                  : selectedRecord.CardName}
              </span>
            </div>
            {/* <div className="mb-2 row">
          <span className="text-gray col-md-3">Address</span>&emsp;
          <span className="font-weight-700">: {selectedRecord?.ShipTo}</span>
        </div> */}
            <div className="mb-2 row">
              <span className="text-gray col-md-3">Location</span>&emsp;
              <span className="font-weight-700">: {selectedRecord?.U_Location}</span>
            </div>
            <div className="row">
              <span className="text-gray col-md-3">{dateLabel}</span>&emsp;
              <span className="font-weight-700">
                : {formatDate(selectedRecord?.DocDate, "MMMM D, YYYY")}
              </span>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card className="pl-sm-4 pr-sm-4 pt-sm-3 pb-sm-0 mt--1 mb-3 shadow">
          <Row className="pb-3">
            {/* <Col sm="6" md="3">
          <small className="text-muted">Customer Code </small>
          <h4 className="mt-1">{selectedRecord?.CardCode}</h4>
        </Col> */}
            <Col sm="6" md="4">
              <small className="text-muted">Customer Name</small>
              <h4 className="mt-1">
                {selectedRecord.U_CODCntName
                  ? selectedRecord.U_CODCntName
                  : selectedRecord.CardName}
              </h4>
            </Col>
            {/* <Col sm="6" md="3">
          <small className="text-muted">Customer Reference#</small>
          <h4 className="mt-1">{selectedRecord?.NumAtCard}</h4>
        </Col> */}
            <Col sm="6" md="4">
              <small className="text-muted">Address</small>
              <h4 className="mt-1">{selectedRecord?.ShipTo}</h4>
            </Col>
            <Col sm="6" md="4">
              <small className="text-muted">Posting Date</small>
              <h4 className="mt-1">{formatDate(selectedRecord?.DocDate, "MMMM D, YYYY")}</h4>
            </Col>
          </Row>
        </Card>
      )}
    </>
  );
};

export default HeaderRecordDetailsCard;
