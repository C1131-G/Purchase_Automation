import React, { useState, useContext } from "react";
import KeyPad from "./KeyPad.js";

const CashPayment = ({ type }) => {
  return (
    <>
      <KeyPad type={type} keySize={2} textboxAreaSize={8} />
    </>
  );
};

export default CashPayment;
