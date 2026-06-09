import React, { useState } from "react";
import { Card, Row, Col, FormGroup, FormFeedback, Input } from "reactstrap";
import CustomModal from "../../../../components/CustomModal.js";
import TimYardTransTable from "./Table.js";
import { useEffect } from "react";

const Modal = ({
  isOpen,
  closeModal,
  itemCode,
  whsCode,
  docNum,
  timYardTran,
  setTimYardTran,
  timYardTrans,
  setTimYardTrans,
  isEditQuotation,
  isQuotation,
  isNew,
  ViewOnly,
}) => {
  //const Modal = ({  isOpen, closeModal, itemCode, whsCode, docNum, timYardTran, setTimYardTran, timYardTrans, setTimYardTrans, isEditQuotation, isNew, ViewOnly }) => {
  // const closeModal = () => {
  //   props.closeModal();
  // }

  return (
    <>
      <CustomModal
        modalSize="xl"
        buttonSize="md"
        isOpen={isOpen}
        title={"Sales Batch Selection"}
        infoMessage={"Click on 'Close' button to save and close a transaction."}
        isLoading={false}
        closeModal={closeModal}
      >
        <TimYardTransTable
          className="mt--4 mx--2"
          closeModal={closeModal}
          itemCode={itemCode}
          warehouseCode={whsCode}
          timYardTran={timYardTran}
          setTimYardTran={setTimYardTran}
          timYardTrans={timYardTrans} // Pass the timYardTrans data
          setTimYardTrans={setTimYardTrans} // Pass the state updater function
          isEditQuotation={isEditQuotation}
          isQuotation={isQuotation}
          docNum={docNum} // Pass the DocNum if available
          isNew={isNew} // Pass ModuleName prop
          ViewOnly={ViewOnly} // Pass ViewOnly prop
        />
      </CustomModal>
    </>
  );
};

export default Modal;
