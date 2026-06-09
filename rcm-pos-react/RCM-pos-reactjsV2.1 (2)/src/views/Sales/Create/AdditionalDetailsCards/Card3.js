import React, { useState, useContext, useEffect } from "react";
import { Card, CardBody, Row, Col, CardHeader, Form, Input, FormGroup } from "reactstrap";
import InputWithLabel from "../../../../components/Input/InputWithLabel.js";

import { UserPermissionsContext } from "../../../../contexts/UserPermissionsContext.js";
import { SalesContext } from "./../context/SalesContext";

const AdditionalDetailsCard3 = ({ setWarningMsg }) => {
  const { userSessionLog, storeWHCode, getLocationBasedDefaultCardCode } =
    useContext(UserPermissionsContext);
  const { salesHeader, setSalesHeader } = useContext(SalesContext);

  const handleChange = (e) => {
    setSalesHeader(e.target.name, e.target.value);
  };

  return (
    <Card className="shadow mb-3">
      <CardBody className="pt-2 pb-2 mt-0">
        <div className="flex-nowrap mx-0">
          <Row>
            <Col className="col mb--2 pb-1">
              <small className="text-muted font-weight-800">Remarks</small>
              <FormGroup className="mt-1 mb--1 pb--3 mb-3">
                <InputWithLabel
                  className="mt--1 pt-1"
                  bsSize="sm"
                  type="text"
                  rows
                  // label={"Remarks"}
                  fieldName={"Comments"}
                  value={salesHeader && salesHeader.Comments ? salesHeader.Comments : ""}
                  placeholder={"Enter Remarks"}
                  // displayMode={displayModes.EDIT}
                  handleChange={handleChange}
                />
              </FormGroup>
            </Col>
          </Row>
        </div>
      </CardBody>
    </Card>
  );
};

export default AdditionalDetailsCard3;
