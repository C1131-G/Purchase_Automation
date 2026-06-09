import React, { useContext, useEffect, useState } from "react";
import { Card, Row, Col, InputGroup, FormGroup } from "reactstrap";
import ReactDatetime from "react-datetime";
import moment from "moment";

import PaymentTermsDropdown from "../../../components/PaymentTermsDropdown";
import CustomerContactPersonDropdown from "../../../components/CustomerContactPersonDropdown";
import { UserPermissionsContext } from "../../../../contexts/UserPermissionsContext.js";
import { SalesQuotationContext } from "../context/SalesQuotationContext.js";
import { formatDate } from "../../../../config/util.js";

const NO_OF_DAYS_VALIDITY = 10; // Default validity period for Sales Quotation

const AdditionalDetailsCard = ({ setWarningMsg }) => {
  const serverDateTime = ReactDatetime.moment(new Date());
  const { userSessionLog, getLocationBasedDefaultCardCode } = useContext(UserPermissionsContext);
  const {
    customer,
    isOneTimeCustomer,
    isCODCustomer,
    setSalesQuotationHeader,
    salesQuotationHeader,
    setSalesQuotationResponse,
  } = useContext(SalesQuotationContext);

  const today = new Date();

  const handleDateChange = (momentObj, stateProp) => {
    // if (moment.isMoment(momentObj))
    //   setSalesQuotationHeader([stateProp], momentObj.format("MMMM D, YYYY"));
    // else {
    //   //this.setState({ [stateProp]: serverDateTime });
    //   setSalesQuotationHeader([stateProp], serverDateTime);
    // }
    const formattedDate = moment.isMoment(momentObj)
      ? momentObj.format("MMMM D, YYYY")
      : serverDateTime;
    setSalesQuotationHeader(stateProp, formattedDate);
  };

  useEffect(() => {
    if (!salesQuotationHeader.postingDate) {
      const postingDate = formatDate(new Date(), "MMM D, YYYY");
      setSalesQuotationHeader("postingDate", postingDate);
    }
  }, [salesQuotationHeader.postingDate, setSalesQuotationHeader]);

  useEffect(() => {
    if (salesQuotationHeader.postingDate && !salesQuotationHeader.expiryDate) {
      const postingDate = moment(salesQuotationHeader.postingDate, "MMM D, YYYY");
      const expiryDate = postingDate.add(NO_OF_DAYS_VALIDITY, "days").format("MMMM D, YYYY");
      setSalesQuotationHeader("expiryDate", expiryDate);
    }
  }, [salesQuotationHeader.postingDate, salesQuotationHeader.expiryDate, setSalesQuotationHeader]);

  return (
    <>
      <Card className="px-md-2 px-lg-3 pt-sm-3 pb-2 mt-0 mb-3 shadow">
        <Row>
          <Col md="3" className="mt--1">
            <CustomerContactPersonDropdown
              label={"Customer Contact"}
              propName={"customerContact"}
              value={salesQuotationHeader?.customerContact}
              customerCardCode={
                !isOneTimeCustomer
                  ? customer.CardCode
                  : getLocationBasedDefaultCardCode(isCODCustomer)
              }
              handleChange={setSalesQuotationHeader}
            />
            {/* :
                          <h4 className="mt-1">
                            {customerContact ? customerContact : this.props.selectedRecord?.ContactPersonCode}
                          </h4> */}
          </Col>
          <Col md="3">
            <small className="text-muted">Posting Date</small>
            <h4 className="mt-1">
              {salesQuotationHeader && salesQuotationHeader.postingDate
                ? salesQuotationHeader.postingDate
                : ""}
            </h4>
          </Col>
          <Col sm="6" md="3">
            <small className="text-muted">Valid Until</small>

            <FormGroup className="mt-1">
              <InputGroup className="form-control form-control-sm">
                <i className="ni ni-calendar-grid-58 mt-1" />
                <ReactDatetime
                  inputProps={{
                    disabled: true,
                    className: "text-gray-dark mr-3 ml-2 mt--5 border-0 cursor-pointer",
                    readOnly: true,
                  }}
                  value={
                    salesQuotationHeader && salesQuotationHeader.expiryDate
                      ? salesQuotationHeader.expiryDate
                      : ""
                  }
                  onChange={(momentObj) => handleDateChange(momentObj, "expiryDate")}
                  //isValidDate={this.disablePastDates}
                  timeFormat={false}
                  dateFormat={"MMMM D, YYYY"}
                  closeOnSelect={true}
                />
              </InputGroup>
            </FormGroup>
          </Col>
        </Row>
      </Card>
    </>
  );
};

export default AdditionalDetailsCard;
