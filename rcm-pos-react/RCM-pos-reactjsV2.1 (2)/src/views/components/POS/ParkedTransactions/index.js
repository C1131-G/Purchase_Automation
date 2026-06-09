import React, { useState } from "react";
import { Card, Row, Col, FormGroup, FormFeedback, Input } from "reactstrap";
import CustomModal from "../../../../components/CustomModal.js";
import ParkedTransactions from "./Table.js";
import { useEffect } from "react";

const Modal = ({ isOpen, closeModal, getParkedTrxs, deleteParkedTrx, resumeTrx }) => {
  // const closeModal = () => {
  //   props.closeModal();
  // }

  return (
    <>
      <CustomModal
        modalSize="xxl"
        buttonSize="md"
        isOpen={isOpen}
        title={"Parked Transactions"}
        infoMessage={"Click on 'Resume' button to continue a transaction."}
        isLoading={false}
        closeModal={closeModal}
      >
        <ParkedTransactions
          className="mt--4 mx--2"
          closeModal={closeModal}
          getParkedTrxs={getParkedTrxs}
          deleteParkedTrx={deleteParkedTrx}
          resumeTrx={resumeTrx}
        />
      </CustomModal>
    </>
  );
};

export default Modal;
