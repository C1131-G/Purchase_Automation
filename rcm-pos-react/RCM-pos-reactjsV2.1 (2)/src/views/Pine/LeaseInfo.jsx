import React, { useState, useContext } from "react";
import {
  Row,
  Col,
  Card,
  CardBody,
  TabContent,
  FormGroup,
  InputGroup,
  InputGroupText,
  Input,
  Button,
} from "reactstrap";
import ReactDatetime from "react-datetime";
import moment from "moment";
import { currencySymbol } from "../../config/config";
import { round } from "../../config/util";

import { LeaseContext } from "./context/LeaseContext";

const today = ReactDatetime.moment(new Date());

const LeaseInfo = () => {
  const { paidAmount, setPaidAmount } = useContext(LeaseContext);
  const [endDate, setEndDate] = useState(today);

  const handleReset = () => {
    setPaidAmount(0);
  };

  const handleChange = (value) => {
    setPaidAmount(value);
  };

  /** Check if the obj. passed is a valid Moment object before calling the format() funct.
   * This is to avoid the error that was thrown when user uses the keyboard to update the date
   */
  const handleDateChange = (momentObj) => {
    if (moment.isMoment(momentObj)) setEndDate(momentObj.format("MMMM D, YYYY"));
    else {
      setEndDate(today);
    }
  };

  const handlePinEntry = (digit) => {
    // if(digit === ".") {
    //   setPaidAmount(`${paidAmount}${digit}`);
    //   return;
    // }
    if (!isNaN(parseFloat(digit))) {
      //append the new digit to the existing value
      const updatedAmount = `${paidAmount}${digit}`;
      setPaidAmount(round(parseFloat(updatedAmount), 2));
    }
  };

  const handleClearPin = () => {
    if (paidAmount) {
      const amount = paidAmount.toString().slice(0, -1); //returns a new string without the last digit
      setPaidAmount(amount ? round(parseFloat(amount), 2) : 0);
    }
  };

  return (
    <>
      <h6 className="heading-small text-muted mb-3">Lease Details</h6>
      <Card className="pl-sm-4 pr-sm-4 pt-sm-3 pb-sm-0 mt-3 mb-3 shadow">
        <Row className="mt--1">
          <Col sm="6" md="4">
            <small className="text-muted">Lease Area</small>
            <FormGroup className="mt-1 mb-3">
              <Input
                bsSize="sm"
                // readOnly={this.state.displayMode === displayModes.VIEW}
                type="number"
                value={""}
                className="form-control display-4 text-gray-dark"
                id="leaseArea"
                name="leaseArea"
                placeholder="Enter Lease Area"
                onChange={(e) => handleChange(e)}
              />
            </FormGroup>
          </Col>
          <Col sm="6" md="4">
            <small className="text-muted">Start Date</small>
            <FormGroup className="mt-1">
              <InputGroup>
                <i className="ni ni-calendar-grid-58 mt-1" />
                <ReactDatetime
                  inputProps={{
                    className: "text-gray-dark mr-3 ml-2 mt--5 border-0 cursor-pointer",
                    readOnly: true,
                  }}
                  value={today}
                  // onChange={(momentObj) => handleDateChange(momentObj, "paymentDate")}
                  // isValidDate={this.disableFutureDates}
                  timeFormat={false}
                  dateFormat={"MMMM D, YYYY"}
                  closeOnSelect={true}
                />
              </InputGroup>
            </FormGroup>
          </Col>
          <Col sm="6" md="4">
            <small className="text-muted">End Date</small>
            <FormGroup className="mt-1">
              <InputGroup>
                <i className="ni ni-calendar-grid-58 mt-1" />
                <ReactDatetime
                  inputProps={{
                    className: "text-gray-dark mr-3 ml-2 mt--5 border-0 cursor-pointer",
                    readOnly: true,
                  }}
                  value={endDate}
                  onChange={(momentObj) => handleDateChange(momentObj)}
                  timeFormat={false}
                  dateFormat={"MMMM D, YYYY"}
                  closeOnSelect={true}
                />
              </InputGroup>
            </FormGroup>
          </Col>
        </Row>
        <Row className="mb-3">
          <Col sm="6" md="4">
            <small className="text-muted">Number of Years</small>
            <h4 className="mt-1">{7} years</h4>
          </Col>
          <Col sm="6" md="4">
            <small className="text-muted">Lease Rate per Hectare</small>
            <InputGroup>
              <Input
                bsSize="sm"
                // readOnly={this.state.displayMode === displayModes.VIEW}
                // style={{ width: 100 + "%" }}
                value={""}
                className={"form-control display-4 text-gray-dark "}
                id="leaseRate"
                name="leaseRate"
                placeholder="Enter Lease Rate"
                type="text"
                onChange={(e) => handleChange(e)}
              />
            </InputGroup>
          </Col>
        </Row>
      </Card>
    </>
  );
};

export default LeaseInfo;
