import React, { useState, useContext } from "react";
import {
  Row,
  Col,
  Card,
  CardBody,
  TabContent,
  TabPane,
  Nav,
  NavItem,
  NavLink,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  Button,
  Badge,
} from "reactstrap";
import PinConsole from "../../../components/POS/PinConsole";
import {
  currencySymbols,
  systemCurrency,
  PAYMENT_METHODS,
  PRECISION,
} from "../../../../config/config.js";
import { round } from "../../../../config/util";

import { SalesContext } from "./../context/SalesContext";
import { roundPrice } from "views/common-utils/calculations.util";

const KeyPad = ({ type, keySize = 3, textboxAreaSize = 9 }) => {
  const { paymentInfo, setPaymentInfo, getTotalInvoiceAmount, getPaidAmount } =
    useContext(SalesContext);

  const updatePaymentInfo = (updatedAmount) => {
    const updatedPaymentInfo =
      paymentInfo && paymentInfo[type]
        ? // && Object.keys(paymentInfo).length > 0
          { ...paymentInfo }
        : // assign an empty Obj. for current Payment type
          { ...paymentInfo, [type]: {} };

    // Reset `Credit` & `Check` payment info when a Cash or Card payment is made
    if (updatedPaymentInfo[PAYMENT_METHODS.Credit]) {
      delete updatedPaymentInfo[PAYMENT_METHODS.Credit];
    }
    if (updatedPaymentInfo[PAYMENT_METHODS.Check]) {
      delete updatedPaymentInfo[PAYMENT_METHODS.Check];
    }

    updatedPaymentInfo[type].amount = updatedAmount;
    setPaymentInfo(updatedPaymentInfo);
  };

  /**
   * Remove other payment type details, if present & add full Invoice Amt to Current Payment type
   */
  const handlePayFull = () => {
    const updatedPaymentInfo = paymentInfo[type] ? { [type]: paymentInfo[type] } : { [type]: {} };
    updatedPaymentInfo[type].amount = roundPrice(getTotalInvoiceAmount());
    setPaymentInfo(updatedPaymentInfo);
  };

  const handleReset = () => {
    // setPaidAmount(0);
    updatePaymentInfo(0);
  };

  const handleChange = (value) => {
    // setPaidAmount(value);
    updatePaymentInfo(value);
  };

  const handlePinEntry = (digit) => {
    let paidAmount = paymentInfo && paymentInfo[type]?.amount ? paymentInfo[type]?.amount : 0;
    //Check if the amount already doesn't includes a "."
    if (
      digit === "." &&
      paidAmount &&
      paidAmount.toString().length > 0 &&
      paidAmount.toString().indexOf(".") === -1
    ) {
      // setPaidAmount(`${paidAmount}${digit}`);
      updatePaymentInfo(`${paidAmount}${digit}`);
    }
    if (!isNaN(parseFloat(digit))) {
      //append the new digit to the existing value
      // setPaidAmount(round(parseFloat(updatedAmount), 2));
      const updatedAmount = `${paidAmount}${digit}`;
      updatePaymentInfo(round(parseFloat(updatedAmount), 2));
    }
  };

  const handleClearPin = () => {
    let paidAmount = paymentInfo && paymentInfo[type]?.amount ? paymentInfo[type]?.amount : 0;
    if (paidAmount) {
      const updatedAmount = paidAmount.toString().slice(0, -1); //returns a new string without the last digit
      // setPaidAmount(updatedAmount ? round(parseFloat(updatedAmount), 2) : 0);
      updatePaymentInfo(updatedAmount ? round(parseFloat(updatedAmount), 2) : 0);
    }
  };

  return (
    <>
      <Row className="ml-3 mb-3">
        <Col md="6">
          {/* <Badge
            size="sm"
            color="info cursor-pointer shadow-lg"
            onClick={() => handleChange(getTotalInvoiceAmount())}
            className="text-uppercase"
          >
            Pay Full
          </Badge> */}
          <Button
            // outline
            size="sm"
            color="info cursor-pointer"
            onClick={handlePayFull}
            className="text-uppercase"
          >
            Pay Full &nbsp;
            <i className="fa fa-check-circle" />
          </Button>
          {/*
          LATER: Can do this later!
          {getTotalInvoiceAmount() - getPaidAmount() > 0 &&
            <Button
              outline
              size="sm"
              color="warning cursor-pointer"
              onClick={() => handleChange(round(getTotalInvoiceAmount() - getPaidAmount(), PRECISION))}
              className="text-uppercase"
            >
              Pay Balance
            </Button>
          } */}
        </Col>
      </Row>
      <Row>
        {/* <Col sm="2" className="text-end mt-3">
          <h4 className="text-primary">Total:</h4>
        </Col> */}
        <Col md={textboxAreaSize}>
          <Row>
            <Col className="mr--2 ml-4">
              <div style={{ position: "relative" }}>
                {" "}
                {/** display: "inline-block" | adding this shrinks the textbox size */}
                <Input
                  type="text" //"number" //to allow "."
                  className="pin-input mb-3"
                  value={paymentInfo && paymentInfo[type]?.amount ? paymentInfo[type]?.amount : ""}
                  onChange={(e) => handleChange(e.target.value)}
                  placeholder="0.00"
                  // readOnly
                />
                {/* <span
                  className="cursor-pointer text-lg"
                  style={{ position: "absolute", right: "15px", top: "17%",
                    // transform: "translateY(-80%)",
                  }}
                  onClick={() => handleReset()}
                >
                  <i className="fa fa-times text-danger" />
                </span> */}
              </div>
            </Col>
            <Col className="pt-1">
              <Button color="danger" onClick={() => handleReset()} className="btn-square" size="md">
                Reset
              </Button>
            </Col>
          </Row>
        </Col>
      </Row>
      <Row>
        <Col md="12">
          <PinConsole
            handlePinEntry={handlePinEntry}
            handleClearPin={handleClearPin}
            keySize={keySize}
          />
        </Col>
        {/* <Col md="6">
          <CurrencyDenomination />
        </Col> */}
      </Row>
    </>
  );
};

export default KeyPad;
