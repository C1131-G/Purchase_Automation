import React, { useState, useContext } from "react";
import { useHistory } from "react-router-dom";
import { Row, Col, Button } from "reactstrap";
import CustomModal from "../../../components/CustomModal";
import QRCodeScannerContainer from "../../../components/QRCodeScannerContainer";
import { getStoreCounters } from "../../../helper/store-counter";
import { updateUsersSessionLog } from "../../../helper/users-session-log";
import { displayModes, portalModules } from "../../../config/config";

import { UserPermissionsContext } from "../../../contexts/UserPermissionsContext";

const CounterSelectionModal = (props) => {
  const { checkUserPermission, userSessionLog, setUserSessionLog, setStoreWHCode } =
    useContext(UserPermissionsContext);
  const history = useHistory();

  const moduleName = portalModules.STORE_COUNTER;
  const [isOpen, setIsOpen] = useState(props.isOpen);
  const [isLoading, setIsLoading] = useState(false);
  const [warningMsg, setWarningMsg] = useState("");

  const handleCancel = () => {
    history.goBack();
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  const handleQRCodeScan = async (scannedValue) => {
    if (typeof scannedValue === "object" && scannedValue.counterCode) {
      scannedValue = scannedValue.counterCode;
    }
    console.log("CounterSelectionModal - handleQRCodeScan: ", JSON.stringify(scannedValue));
    //Get the details for the entered Counter Code
    if (scannedValue) {
      setIsLoading(true);
      try {
        const counter = await getStoreCounters(null, { counterCode: scannedValue });
        if (Array.isArray(counter) && counter.length > 0) {
          await setCounterToSession(counter[0]);
        } else {
          setWarningMsg("Counter doesn't exist! Enter a valid code!");
        }
      } catch (err) {
        if (err.response && err.response.data.message) {
          setWarningMsg(err.response.data.message);
        } else {
          setWarningMsg(JSON.stringify(err));
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      setWarningMsg(`Enter a valid ${moduleName} Code.`);
    }
  };

  const setCounterToSession = async (selectedCounter) => {
    const { storeId, storeCounterId, counterCode, counterName } = selectedCounter;

    try {
      //Set the 'counter` into to UserSessionLog
      if (userSessionLog && userSessionLog.userSessionLogId) {
        const response = await updateUsersSessionLog(
          { storeId, storeCounterId, counterCode, counterName },
          userSessionLog.userSessionLogId,
        );
        if (response) {
          const updatedSessionLog = {
            ...userSessionLog,
            storeId,
            storeCounterId,
            storeLocation: response.storeLocation,
            counterCode,
            counterName,
          };
          console.log("updatedSessionLog: ", JSON.stringify(updatedSessionLog));
          //Update `context` with selected `counter` info only when the session log is updated as expected
          setUserSessionLog(updatedSessionLog);
          setStoreWHCode(response.storeWHCode);
        }
      }
    } catch (err) {
      throw err;
    }
  };

  return (
    <>
      <CustomModal
        modalSize="md"
        buttonSize="sm"
        isOpen={isOpen}
        title={"Terminal Assignment"}
        infoMessage={"Scan a Terminal QR Code!"}
        isLoading={isLoading}
        hideCloseButton={true}
        closeModal={closeModal}
        //NOTE: Need to first disable reactstrap Modal's `autoFocus` (which is set as true on initialization)
        //to set the focus on an element (textbox) within the Modal
        disableAutoFocus={true}
      >
        <QRCodeScannerContainer
          title="QR Code Scanner"
          // subTitle="Scan a counter QR Code to continue"
          placeholder="Terminal Code"
          moduleName={moduleName}
          displayMode={displayModes.NORMAL}
          isLoading={isLoading}
          message={warningMsg}
          handleQRCodeScan={handleQRCodeScan}
          autoFocus={true}
        />
        <Row>
          <Col className="text-right">
            <Button
              // size="sm"
              color="danger"
              data-dismiss="modal"
              type="button"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </Col>
        </Row>
      </CustomModal>
    </>
  );
};

export default CounterSelectionModal;
