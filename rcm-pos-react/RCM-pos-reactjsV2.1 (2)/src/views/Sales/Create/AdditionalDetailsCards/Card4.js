import React, { useContext, useEffect, useState } from "react";
import { Card, Row, Col, InputGroup, CustomInput, FormGroup } from "reactstrap";

import { UserPermissionsContext } from "../../../../contexts/UserPermissionsContext.js";
import { SalesContext } from "../context/SalesContext";
import UserDropdown from "../../../components/UserDropdown";
import { userGroups, displayModes } from "../../../../config/config.js";

const AdditionalDetailsCard = ({ setWarningMsg }) => {
  //const { userSessionLog, getLocationBasedDefaultCardCode } = useContext(UserPermissionsContext);
  const { customer, isOneTimeCustomer, isCODCustomer, setSalesHeader, salesHeader } =
    useContext(SalesContext);
  const [isHomeDelivery, setIsHomeDelivery] = useState(false);
  const [userId, setUserId] = useState("");
  let moduleName = userGroups.DELIVERY_AGENT;

  useEffect(() => {
    if (isCODCustomer) {
      setIsHomeDelivery(true);
    }
  }, [isCODCustomer]);

  // const handleUserChange = () => {
  //   console.log("handleUserChange")
  //   setSalesHeader("U_DeliveryAgent", userId);
  // }

  return (
    <>
      <Card className="px-md-2 px-lg-3 pt-sm-3 pb-2 mt-0 mb-3 shadow">
        <Row>
          <Col md="3" className="mt--1">
            <CustomInput
              inline
              bsSize="xs"
              id="homeDelivery"
              type="checkbox"
              label={"Home Delivery"}
              className="text-muted mt--0 custom-control-label-sm"
              checked={isHomeDelivery}
              onChange={() => setIsHomeDelivery(!isHomeDelivery)}
              disabled={true}
            />
          </Col>
          {/* <Col sm="4">
            <FormGroup>
              <small className="text-muted mb-3">Delivery Agent</small>
              <UserDropdown
                userId={salesHeader && salesHeader.U_DeliveryAgent ? salesHeader.U_DeliveryAgent : ""}
                moduleName={moduleName}
                handleChange={setSalesHeader}
                displayMode={displayModes.EDIT}
              // displayMode={checkUserPermission(moduleName, permissions.CREATE) ?
              //   displayModes.EDIT : displayModes.VIEW}
              />
            </FormGroup>
          </Col> */}
          {/* <Col md="3">
            <small className="text-muted">Posting Date</small>
            <h4 className="mt-1">
              {salesHeader && salesHeader.postingDate ? salesHeader.postingDate : ""}
            </h4>
          </Col>
          <Col sm="6" md="3">
            <small className="text-muted">Valid Until</small>

            <FormGroup className="mt-1">
              <InputGroup className="form-control form-control-sm">
                <i className="ni ni-calendar-grid-58 mt-1" />
                <ReactDatetime
                  inputProps={{
                    className: "text-gray-dark mr-3 ml-2 mt--5 border-0 cursor-pointer",
                    readOnly: true
                  }}
                  value={salesHeader && salesHeader.expiryDate ? salesHeader.expiryDate : ""}
                  onChange={(momentObj) => handleDateChange(momentObj, "expiryDate")}
                  //isValidDate={this.disablePastDates}
                  timeFormat={false}
                  dateFormat={"MMMM D, YYYY"}
                  closeOnSelect={true}
                />
              </InputGroup>
            </FormGroup>
          </Col>
          <Col sm="6" md="3">
            <PaymentTermsDropdown
              label={"Payment Term"}
              propName={"paymentTerm"}
              value={salesHeader && salesHeader.paymentTerm ? salesHeader.paymentTerm : ""}
              handleChange={setSalesHeader}
            />
          </Col> */}
        </Row>
      </Card>
    </>
  );
};

export default AdditionalDetailsCard;
