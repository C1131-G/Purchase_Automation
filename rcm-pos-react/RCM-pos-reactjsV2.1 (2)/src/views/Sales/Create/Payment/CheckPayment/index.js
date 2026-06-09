import React, { useState, useContext, useEffect, useRef } from "react";
import { Row, Col, CustomInput, FormGroup } from "reactstrap";
import InputWithLabel from "../../../../../components/Input/InputWithLabel.js";
import BankAutoComplete from "../../../../components/AutoComplete/BankAutoComplete";

import { SalesContext } from "./../../context/SalesContext.js";
import {
  PAYMENT_METHODS,
  displayModes,
  systemCurrency,
  currencySymbols,
  countryCode,
} from "../../../../../config/config.js";
import { getValidNumber, round } from "../../../../../config/util.js";

import { checkPaymentFields, getDefaultValues, getDefaultValidation } from "./fields.js";
import { roundPrice } from "views/common-utils/calculations.util.js";

const CheckPayment = ({ type, setWarningMsg }) => {
  const { getTotalInvoiceAmount, paymentInfo, setPaymentInfo } = useContext(SalesContext);
  const autoCompleteRef = useRef(null);

  const updatePaymentInfo = (propName, value) => {
    const updatedPaymentInfo =
      paymentInfo && paymentInfo[type]
        ? { ...paymentInfo }
        : // assign an empty Obj. for current Payment type
          { ...paymentInfo, [type]: {} };

    updatedPaymentInfo[type][propName] = value;
    // Remove `Cash`, `Card` & `Credit` payment info when a `Check` payment is made
    // as Credit payment CANNOT be combined with any other payment mode.
    if (updatedPaymentInfo[PAYMENT_METHODS.Cash]) {
      delete updatedPaymentInfo[PAYMENT_METHODS.Cash];
    }
    if (updatedPaymentInfo[PAYMENT_METHODS.Card]) {
      delete updatedPaymentInfo[PAYMENT_METHODS.Card];
    }
    if (updatedPaymentInfo[PAYMENT_METHODS.Credit]) {
      delete updatedPaymentInfo[PAYMENT_METHODS.Credit];
    }
    setPaymentInfo(updatedPaymentInfo);
    setWarningMsg("");
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    if (name === "Endorse") {
      if (checked) {
        updatePaymentInfo("Endorse", "tYES");
      } else {
        updatePaymentInfo("Endorse", "tNO");
      }
    } else if (name === "payViaCheck") {
      if (checked) {
        setCheckPayment();
      } else {
        // Reset payment info
        setPaymentInfo({});
      }
    }
  };

  /**
   * Remove `Cash`, `Card` & `Credit` payment info when a `Check` payment is made
   * as Check payment CANNOT be combined with any other payment mode.
   */
  const setCheckPayment = () => {
    const updatedPaymentInfo = { [type]: { amount: roundPrice(getTotalInvoiceAmount()) } };
    setPaymentInfo(updatedPaymentInfo);
  };

  /**
   * Sets the selected Bank info to the `context`
   * @param {Object} {BankCode, BankName}
   */
  const handleBankSelection = (selectedBank) => {
    console.log("handleBankSelection: ", JSON.stringify(selectedBank));
    if (selectedBank && selectedBank.BankCode) {
      updatePaymentInfo("BankCode", selectedBank.BankCode);
    } else {
      updatePaymentInfo("BankCode", "");
    }
  };

  const handleFieldChange = (e) => {
    updatePaymentInfo(e.target.name, e.target.value);
    setWarningMsg("");
  };

  return (
    <>
      <Row className="mt-0">
        <Col xs="12">
          <CustomInput
            type="checkbox"
            className="font-weight-600"
            id="payViaCheck"
            name="payViaCheck"
            label="Pay via Check/Voucher"
            onChange={handleCheckboxChange}
            // Check the box when the amount is paid via Check alone
            checked={getValidNumber(paymentInfo?.[type]?.amount) > 0}
          />
        </Col>
      </Row>
      <Row className="mt-3">
        <Col sm="12" md="4">
          <small className="text-muted">Bank</small>
          <FormGroup className="pt-1">
            <BankAutoComplete
              ref={autoCompleteRef}
              handleSelection={handleBankSelection}
              setWarningMsg={setWarningMsg}
            />
          </FormGroup>
        </Col>
        {checkPaymentFields.map((field) => {
          if (field.label) {
            return (
              <Col sm="12" md={field.md}>
                <InputWithLabel
                  bsSize="sm"
                  type="text"
                  rows
                  label={field.label}
                  fieldName={field.fieldName}
                  value={paymentInfo?.[type]?.[field.fieldName]}
                  placeholder={field.placeholder}
                  handleChange={handleFieldChange}
                />
              </Col>
            );
          }
        })}
        <Col sm="12" md="4" className="mt-4 pt-1">
          <CustomInput
            type="checkbox"
            className="font-weight-400"
            id="endorse"
            name="Endorse"
            label="Endorse"
            onChange={handleCheckboxChange}
            checked={paymentInfo?.[type]?.Endorse === "tYES"}
          />
        </Col>
      </Row>
    </>
  );
};

export default CheckPayment;
