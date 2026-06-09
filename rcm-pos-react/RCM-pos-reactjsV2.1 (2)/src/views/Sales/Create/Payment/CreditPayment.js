import React, { useContext } from "react";
import { Container, Row, Col, Badge, CustomInput, Alert } from "reactstrap";
import {
  displayModes,
  currencySymbols,
  systemCurrency,
  PRECISION,
  statusColors,
} from "../../../../config/config";
import DisplayMessage from "../../../../components/DisplayMessage.js";
import InputWithLabel from "../../../../components/Input/InputWithLabel.js";

import { SalesContext } from "./../context/SalesContext";
import { getValidNumber, round } from "../../../../config/util.js";
import { roundPrice } from "views/common-utils/calculations.util";

const CreditPayment = ({ type, customer, setWarningMsg }) => {
  const { getTotalInvoiceAmount, paymentInfo, setPaymentInfo } = useContext(SalesContext);

  const handleCheckboxChange = (e) => {
    if (e.target.checked) {
      setCreditPayment();
    } else {
      // Reset payment info
      setPaymentInfo({});
    }
  };

  const handleFieldChange = (e) => {
    if (e.target?.value?.length > 50) {
      setWarningMsg("Reference# can't be longer than 50 characters!");
    } else {
      updatePaymentInfo(e.target.name, e.target.value);
      setWarningMsg("");
    }
  };

  const updatePaymentInfo = (propName, value) => {
    const updatedPaymentInfo =
      paymentInfo && paymentInfo[type]
        ? { ...paymentInfo }
        : // assign an empty Obj. for current Payment type
          { ...paymentInfo, [type]: {} };

    updatedPaymentInfo[type][propName] = value;
    setPaymentInfo(updatedPaymentInfo);
  };

  /**
   * Remove `Cash` or `Card` payment info when a `Credit` payment is made
   * as Credit payment CANNOT be combined with any other payment mode.
   */
  const setCreditPayment = () => {
    const updatedPaymentInfo = { [type]: { amount: roundPrice(getTotalInvoiceAmount()) } };
    setPaymentInfo(updatedPaymentInfo);
  };

  const field = {
    md: "10",
    label: "Reference#",
    fieldName: "CounterReference",
    placeholder: "Enter Credit Ref#",
    validationMsg: "Enter a valid Ref#",
  };

  const isBalanceSufficient = customer.AvailableBalance >= roundPrice(getTotalInvoiceAmount());

  return (
    <>
      <Row>
        <Col xs="12" className="mb-3">
          {" "}
          {/** text-center  */}
          <h4 className="mb--1 pb-1">Credit Limit:</h4>
          <Badge color="primary" pill>
            {`${currencySymbols[systemCurrency]} ${getValidNumber(customer.CreditLimit, PRECISION)}`}
          </Badge>
        </Col>
      </Row>
      <Row>
        <Col xs="12" className="mb-3">
          <h4 className="mb--1 pb-1">Utilized Amount:</h4>
          <Badge color="warning" pill>
            {`${currencySymbols[systemCurrency]} ${round(getValidNumber(customer.CreditLimit) - getValidNumber(customer.AvailableBalance), PRECISION)}`}
          </Badge>
        </Col>
      </Row>
      <Row>
        <Col xs="12" className="mb-1">
          <h4 className="mb--1 pb-1">Available Balance:</h4>
          <Badge color="success" pill>
            {`${currencySymbols[systemCurrency]} ${getValidNumber(customer.AvailableBalance)}`}
          </Badge>
        </Col>
      </Row>
      <Row className="mt-0">
        <Col xs="12">
          <CustomInput
            type="checkbox"
            className="font-weight-600"
            id="useAvailableBalance"
            label="Use Available Balance"
            disabled={!isBalanceSufficient}
            onChange={handleCheckboxChange}
            // Check the box when amount is paid via Credit alone
            checked={getValidNumber(paymentInfo?.[type]?.amount) > 0}
          />
          {!isBalanceSufficient && (
            <DisplayMessage
              message={"Insufficient balance!"}
              type={statusColors.DANGER}
              iconSize={"sm"}
            />
          )}
        </Col>
      </Row>
      <Row className="mt-3 mb--4">
        <Col md="4">
          <InputWithLabel
            bsSize="sm"
            type="text"
            rows
            label={field.label}
            fieldName={field.fieldName}
            value={paymentInfo && paymentInfo[type] ? paymentInfo[type][field.fieldName] : ""}
            placeholder={field.placeholder}
            displayMode={displayModes.EDIT}
            handleChange={handleFieldChange}
          />
        </Col>
      </Row>
    </>
  );
};

export default CreditPayment;
