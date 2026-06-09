import React, { useContext, useState } from "react";
import { Card, Row, Col, FormGroup, FormFeedback, Input } from "reactstrap";
import CustomModal from "../../../../components/CustomModal.js";
import PaymentMethods from "./PaymentMethods.jsx";
import { validateCheckPaymentForm } from "../Payment/CheckPayment/fields.js";

import { useEffect } from "react";
import { SalesContext } from "../context/SalesContext.js";
import { getValidNumber, round } from "../../../../config/util.js";
import { PAYMENT_METHODS } from "../../../../config/config.js";
import { roundPrice } from "views/common-utils/calculations.util.js";

const Modal = (props) => {
  const { paymentInfo, getTotalInvoiceAmount, getPaidAmount } = useContext(SalesContext);

  const [warningMsg, setWarningMsg] = useState("");

  const closeModal = () => {
    props.closeModal();
  };

  const validateForm = () => {
    let warningMsg = "";
    const invoiceAmount = roundPrice(getTotalInvoiceAmount());
    const paidAmount = round(getPaidAmount(), 2);
    console.log("invoiceAmount: ", invoiceAmount, " paidAmount: ", paidAmount);
    if (Number(paidAmount) < Number(invoiceAmount)) {
      warningMsg = "Pay the balance amount to proceed!";
    }
    // Card payment validation
    else if (getValidNumber(paymentInfo?.[PAYMENT_METHODS.Card]?.amount) > 0) {
      if (!paymentInfo?.[PAYMENT_METHODS.Card]?.CreditCard) {
        warningMsg = "Select a Card type to complete the payment!";
      } else if (!paymentInfo?.[PAYMENT_METHODS.Card].VoucherNum) {
        warningMsg = "Enter Card Reference# to proceed!";
      }
    }
    // Credit payment validation
    else if (getValidNumber(paymentInfo?.[PAYMENT_METHODS.Credit]?.amount) > 0) {
      if (!paymentInfo?.[PAYMENT_METHODS.Credit].CounterReference) {
        warningMsg = "Enter Credit Reference# to proceed!";
      }
    }
    // Check payment validation
    else if (getValidNumber(paymentInfo?.[PAYMENT_METHODS.Check]?.amount) > 0) {
      console.log("paymentInfo[PAYMENT_METHODS.Check]: ", paymentInfo[PAYMENT_METHODS.Check]);
      warningMsg = validateCheckPaymentForm(paymentInfo[PAYMENT_METHODS.Check]);
    }

    if (warningMsg) {
      setWarningMsg(warningMsg);
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      props.handleSubmit();
    }
  };

  useEffect(() => {
    if (props.warningMsg) {
      setWarningMsg(props.warningMsg);
    }
  }, [props.warningMsg]);

  // Reset Warning Msgs when the modal opens or closes
  useEffect(() => {
    setWarningMsg("");
  }, [props.isOpen]);

  return (
    <>
      <CustomModal
        modalSize="xl"
        buttonSize="lg"
        isOpen={props.isOpen}
        // title={"Payment Methods"}
        // infoMessage={"Choose an method and proceed."}
        isLoading={props.isLoading}
        closeModal={closeModal}
        handleSubmit={handleSubmit}
        warningMsg={warningMsg}
      >
        <PaymentMethods
          className="mt--4 mx--2"
          closeModal={closeModal}
          setWarningMsg={setWarningMsg}
          isPaymentAllowed={props.isPaymentAllowed}
        />
      </CustomModal>
    </>
  );
};

export default Modal;
