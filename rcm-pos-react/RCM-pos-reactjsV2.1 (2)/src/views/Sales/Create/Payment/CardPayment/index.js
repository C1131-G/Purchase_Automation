import React, { useState, useContext, useEffect } from "react";
import { Card, Row, Col, Badge, Button } from "reactstrap";
import InputWithLabel from "../../../../../components/Input/InputWithLabel.js";
import KeyPad from "./../KeyPad.js";
import CardsList from "./CardsList.js";

import { UserPermissionsContext } from "../../../../../contexts/UserPermissionsContext.js";
import { SalesContext } from "./../../context/SalesContext.js";
import {
  displayModes,
  systemCurrency,
  currencySymbols,
  PRECISION,
  PAYMENT_METHODS,
} from "../../../../../config/config.js";
import { calculateSurcharge } from "../../../../common-utils/calculations.util.js";
import { getValidNumber, round } from "../../../../../config/util.js";

const CardPayment = ({ type, setWarningMsg }) => {
  const { userSessionLog } = useContext(UserPermissionsContext);
  const { paymentInfo, setPaymentInfo, cardPaymentInfo, setCardPaymentInfo } =
    useContext(SalesContext);

  const [selectedCard, setSelectedCard] = useState("");
  const [surchargeAmount, setSurchargeAmount] = useState(0);
  const [invalidCustomerData, setInvalidCustomerData] = useState({});
  const [cardInfo, setCardInfo] = useState({});
  const [enteredAmount, setEnteredAmount] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const initalCardPayment = {
    amount: 0,
    AcctCode: "",
    voucherNum: "",
    surchargeAmount: 0,
  };
  const [selectedEftpos, setSelectedEftpos] = useState("VISA");
  // When index changes, load data from cardPaymentInfo
  useEffect(() => {
    if (selectedIndex >= 0 && cardPaymentInfo[selectedIndex]) {
      const selectedPayment = cardPaymentInfo[selectedIndex];
      //setSelectedCard(selectedPayment);

      // Update your form fields here
      //setAmount(selectedPayment.amount || 0);
      //setReference(selectedPayment.reference || "");
      // setSelectedBank(selectedPayment.bank || "");
      // setSelectedCardType(selectedPayment.cardType || "");
    }
  }, [selectedIndex, cardPaymentInfo]);

  // Multi-part payment support: Card payments as array
  // Add a new card payment entry to cardPaymentInfo array
  const addCardPayment = (entry) => {
    const newEntry = { ...entry, id: Date.now() }; // Add unique id
    setCardPaymentInfo((prev) => {
      const updated = [...prev, newEntry];
      setSelectedIndex(updated.length - 1); // Select the newly added payment
      return updated;
    });
    ResetPaymentInfo(0); // Reset current card payment in context
    updatePaymentInfo("VoucherNum", ""); // Reset amount in context
  };

  // Update a card payment entry by index
  const updateCardPayment = (index, propName, value) => {
    setCardPaymentInfo((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [propName]: value } : item)),
    );
  };

  // Remove a card payment entry by index
  const removeCardPayment = (index) => {
    setCardPaymentInfo((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      let newSelected = selectedIndex;
      if (updated.length === 0) newSelected = 0;
      else if (selectedIndex >= updated.length) newSelected = updated.length - 1;
      setSelectedIndex(newSelected);
      return updated;
    });
  };

  // Add handler
  // const handleAddCardPayment = async() => {
  //   console.log("paymentInfo: ", JSON.stringify(paymentInfo[type]));
  //   if (validateForm()) {
  //     await addCardPayment(paymentInfo[type]);
  //     console.log("Card Payment Added: ", cardPaymentInfo);
  //   }
  // };

  const handleAddCardPayment = async () => {
    // Validate the form first
    if (validateForm()) {
      const amount = getValidNumber(paymentInfo[type]?.amount);
      const reference = paymentInfo[type]?.VoucherNum || "";

      const fullCardName = selectedCard.CardName || ""; // e.g., "EPOSBSPVISA"

      // 2. Remove the "EPOS" prefix. This code checks if the string starts
      //    with "EPOS" and, if so, removes the first 4 characters.
      const shortCardName = fullCardName.startsWith("EPOS")
        ? fullCardName.substring(4)
        : fullCardName; // e.g., "BSPVISA"

      // Create the new payment object
      const newPayment = {
        amount,
        reference,
        surchargeAmount: surchargeAmount, // Use the state variable for surcharge

        // --- THIS IS THE NEW PROPERTY ---
        // It uses the 'selectedEftpos' state we will set in the CardsList component.
        cardType: shortCardName, // The NAME for the receipt (e.g., "VISA")
        CreditCard: selectedCard.CreditCard, // The CODE for SAP (e.g., 1)
        AcctCode: selectedCard.AcctCode, // The Account Code for SAP
      };

      // Add this new payment object to the array in your context
      addCardPayment(newPayment);
    }
  };

  const handleUpdateCardPayment = () => {
    if (cardPaymentInfo.length > 0 && selectedIndex !== null) {
      const selectedPayment = cardPaymentInfo[selectedIndex];

      // Example: updating multiple fields dynamically
      updateCardPayment(selectedIndex, "amount", selectedPayment.amount);
      updateCardPayment(selectedIndex, "cardNo", selectedPayment.cardNo);
      updateCardPayment(selectedIndex, "cardName", selectedPayment.cardName);
      updateCardPayment(selectedIndex, "expDate", selectedPayment.expDate);
    }
  };

  //Remove handler (removes selected card entry)
  const handleRemoveCardPayment = () => {
    if (cardPaymentInfo.length > 0) {
      removeCardPayment(selectedIndex);
    }
  };

  // Next/Previous selection handlers
  const handleNext = () => {
    if (selectedIndex < cardPaymentInfo.length - 1) {
      console.log("Next selectedIndex Data: ", JSON.stringify(cardPaymentInfo[selectedIndex]));
      const newIndex = selectedIndex + 1;
      setSelectedIndex(newIndex);

      // Sync cardPaymentInfo[newIndex] into paymentInfo
      const entry = cardPaymentInfo[newIndex];
      if (entry) {
        Object.keys(entry).forEach((key) => {
          updatePaymentInfo(key, entry[key]);
        });
      }
    }
  };

  const handlePrevious = () => {
    if (selectedIndex > 0) {
      console.log("Prev selectedIndex Data: ", JSON.stringify(cardPaymentInfo[selectedIndex]));
      const newIndex = selectedIndex - 1;
      setSelectedIndex(newIndex);

      // Sync cardPaymentInfo[newIndex] into paymentInfo
      const entry = cardPaymentInfo[newIndex];
      if (entry) {
        Object.keys(entry).forEach((key) => {
          updatePaymentInfo(key, entry[key]);
        });
      }
    }
  };

  const ResetPaymentInfo = (updatedAmount) => {
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

  const updatePaymentInfo = (propName, value) => {
    const updatedPaymentInfo =
      paymentInfo && paymentInfo[type]
        ? { ...paymentInfo }
        : // assign an empty Obj. for current Payment type
          { ...paymentInfo, [type]: {} };

    updatedPaymentInfo[type][propName] = value;
    setPaymentInfo(updatedPaymentInfo);
  };

  const updatePaymentInfoMultiProp = (object) => {
    const updatedPaymentInfo =
      paymentInfo && paymentInfo[type]
        ? { ...paymentInfo }
        : // assign an empty Obj. for current Payment type
          { ...paymentInfo, [type]: {} };

    // Add the props/values from the `object` to the updatedPaymentInfo
    Object.keys(object).forEach((prop) => {
      updatedPaymentInfo[type][prop] = object[prop];
    });
    setPaymentInfo(updatedPaymentInfo);
  };

  // Card payment validation
  const validateForm = () => {
    if (getValidNumber(paymentInfo?.[PAYMENT_METHODS.Card]?.amount) > 0) {
      if (!paymentInfo?.[PAYMENT_METHODS.Card]?.CreditCard) {
        setWarningMsg("Select a Card type to complete the payment!");
        return false;
      } else if (!paymentInfo?.[PAYMENT_METHODS.Card].VoucherNum) {
        setWarningMsg("Enter Card Reference# to proceed!");
        return false;
      }
    } else {
      setWarningMsg("Enter a valid Amount to proceed!");
      return false;
    }
    setWarningMsg("");
    return true;
  };

  const handleFieldChange = (e) => {
    if (e.target?.value?.length > 20) {
      setWarningMsg("Reference# can't be longer than 20 characters!");
    } else {
      updatePaymentInfo(e.target.name, e.target.value);
      setInvalidCustomerData({
        ...invalidCustomerData,
        [e.target.name]: false,
      });
      setWarningMsg("");
    }
  };

  const handleCardSelection = (card) => {
    console.log("Inspecting the selected card object ", card);

    // Setting props one by one in the `context` DIDN'T work consistently as it is a batch op.
    // When a card is selected before entring Amount, this didnt work

    // updatePaymentInfo("CreditCard", card.CreditCard); // Set Card Type
    // updatePaymentInfo("AcctCode", card.AcctCode); // Set Card A/C
    // updatePaymentInfo("SurchargeAccount", card.SurchargeAccount); // To set in the Journal Entry
    //rvin-start
    if (card && card.CreditCard) {
      setSelectedEftpos(card.CreditCard);
    } //rvin-end

    updatePaymentInfoMultiProp({
      CreditCard: card.CreditCard,
      AcctCode: card.AcctCode,
      SurchargePercentage: card.SurchargePercentage,
      SurchargeAccount: card.SurchargeAccount,
    });
    setSelectedCard(card);
  };

  const getTotalWithSurcharge = (precision = 2) => {
    const cardPayment = getValidNumber(paymentInfo?.[PAYMENT_METHODS.Card]?.amount);
    if (cardPayment > 0) {
      const surchargeAmount = getValidNumber(paymentInfo?.[PAYMENT_METHODS.Card]?.surchargeAmount);
      if (surchargeAmount > 0) {
        return round(cardPayment + surchargeAmount, precision);
      }
    }
    return 0;
  };

  // Update Surcharge whenever the Surcharge% or the Amount Paid via Card changes
  useEffect(() => {
    const surchargeAmount = calculateSurcharge(
      paymentInfo[type]?.amount,
      selectedCard?.SurchargePercentage,
    );
    setSurchargeAmount(surchargeAmount);

    // Update `context`
    updatePaymentInfo("surchargeAmount", surchargeAmount);
  }, [selectedCard?.SurchargePercentage, paymentInfo[type]?.amount]); //selectedCard?.CreditCard,

  const field = {
    md: "10",
    label: "Reference#",
    fieldName: "VoucherNum",
    placeholder: "Enter Credit Card Ref#",
    validationMsg: "Enter a valid Ref#",
  };

  return (
    <>
      <Row>
        <Col sm="12" lg="8" className="mr--5">
          <KeyPad type={type} keySize={3} textboxAreaSize={12} />

          {/* Reference Field Row */}
          <div className="mt-3 w-100">
            <InputWithLabel
              bsSize="sm"
              type="text"
              className="w-100"
              rows
              label={field.label}
              fieldName={field.fieldName}
              value={paymentInfo && paymentInfo[type] ? paymentInfo[type][field.fieldName] : ""}
              placeholder={field.placeholder}
              displayMode={displayModes.EDIT}
              invalidMessage={invalidCustomerData[field.fieldName] ? field.validationMsg : ""}
              handleChange={handleFieldChange}
            />
          </div>
          {/* Buttons for multipart payment actions */}
          <div className="d-flex justify-content-center mt-3 align-items-center">
            {/* <Button
              color="secondary"
              size="lg"
              onClick={handlePrevious}
              disabled={selectedIndex === 0}
              className="flex-fill mx-1 d-flex align-items-center justify-content-center rounded-lg shadow-sm"
              style={{ minWidth: "100px" }}
            >
              <i className="fas fa-arrow-left mr-2"></i> Prev
            </Button> */}

            <Button
              color="success"
              size="lg"
              onClick={handleAddCardPayment}
              className="flex-fill mx-8 d-flex align-items-center justify-content-center rounded-lg shadow-sm justify-content-center col-md-3"
              style={{ maxWidth: "100px" }}
            >
              <i className="fas fa-plus mr-2"></i> Add
            </Button>

            {/* <Button
              color="info"
              size="lg"
              onClick={handleUpdateCardPayment}
              className="flex-fill mx-1 d-flex align-items-center justify-content-center rounded-lg shadow-sm"
              style={{ minWidth: "100px" }}
            >
              <i className="fas fa-edit mr-2"></i> Update
            </Button>

            <Button
              color="danger"
              size="lg"
              onClick={handleRemoveCardPayment}
              className="flex-fill mx-1 d-flex align-items-center justify-content-center rounded-lg shadow-sm"
              style={{ minWidth: "100px" }}
            >
              <i className="fas fa-trash mr-2"></i> Remove
            </Button>

            <Button
              color="secondary"
              size="lg"
              onClick={handleNext}
              disabled={selectedIndex >= cardPaymentInfo.length - 1}
              className="flex-fill mx-1 d-flex align-items-center justify-content-center rounded-lg shadow-sm"
              style={{ minWidth: "100px" }}
            >
              Next <i className="fas fa-arrow-right ml-2"></i>
            </Button>  */}
          </div>

          {/* Show selected payment info
          {cardPaymentInfo.length > 0 && (
            <div className="mt-2">
              <strong>Selected Payment:</strong>
              <pre>{JSON.stringify(cardPaymentInfo[selectedIndex], null, 2)}</pre>
            </div>
          )} */}
        </Col>
        <Col sm="12" lg="4">
          <CardsList
            className="ml-0 mt-sm-3 mt-lg-0"
            location={userSessionLog.storeLocation}
            handleSelection={handleCardSelection}
          />
          <Row className="mt--3">
            <Col md="6">
              <small className="text-mutes">Surcharge%</small>
              <h4>
                {selectedCard && selectedCard.SurchargePercentage
                  ? selectedCard.SurchargePercentage
                  : 0}{" "}
                %
              </h4>
            </Col>
            <Col md="6">
              <small className="text-mutes">Surcharge</small>
              <h4>{`${currencySymbols[systemCurrency]} ${surchargeAmount}`}</h4>
            </Col>
          </Row>
          {getTotalWithSurcharge() > 0 && (
            <Card className="shadow pl-3 pt-2 border border-info my-1">
              <Row className="text-md font-weight-600 mt-1 mb--2">
                <Col className="text-info">
                  <Badge color="info" className="font-weight-600">
                    Total Due (Incl. Surcharge)
                  </Badge>
                  <p>
                    <span className="font-weight-600">{` ${currencySymbols[systemCurrency]} `}</span>
                    <b className="display-4">{`${getTotalWithSurcharge()}`}</b>
                  </p>
                </Col>
              </Row>
            </Card>
          )}
          {/* <InputWithLabel
            bsSize="sm"
            type="text"
            className="mb--2"
            rows
            label={field.label}
            fieldName={field.fieldName}
            value={paymentInfo && paymentInfo[type] ? paymentInfo[type][field.fieldName] : ""}
            placeholder={field.placeholder}
            displayMode={displayModes.EDIT}
            invalidMessage={invalidCustomerData[field.fieldName] ? field.validationMsg : ""}
            handleChange={handleFieldChange}
          /> */}
        </Col>
      </Row>
    </>
  );
};

export default CardPayment;
