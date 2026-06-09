import React, { useState, useEffect } from "react";
import classnames from "classnames";
// reactstrap components
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Form,
  FormGroup,
  Input,
  InputGroupAddon,
  InputGroupText,
  CustomInput,
  Label,
  Row,
  Col,
  Modal,
  CardFooter,
  Table,
  Spinner,
  InputGroup,
  Popover,
  PopoverBody,
} from "reactstrap";
import QRCodeScanner from "./QRCodeScanner";

import { draftStatus as draftStatusList, displayModes, portalModules } from "../config/config.js";

const QRCodeScannerContainer = ({
  title,
  subTitle,
  displayMode,
  isLoading,
  placeholder,
  message,
  handleQRCodeScan,
  autoFocus,
}) => {
  const [scannedValue, setScannedValue] = useState("");
  const [qrScannerPopover, setQRScannerPopover] = useState(false);
  const [warningMsg, setWarningMsg] = useState("");

  const toggleComponent = () => {
    setQRScannerPopover((oldValue) => !oldValue);
  };

  /**
   * Sets the Batch or Serial NO. to the state
   * @param {String} scannedValue
   */
  const handleValueChange = (event) => {
    setScannedValue(event.target.value);
  };

  /**
   * Parses and returns JSON string that is scanned via QR Code reader
   * @param {*} scannedValue
   */
  const parseScannedValue = (scannedValue) => {
    /* If a QR Code is scanned via QRCode Reader
     * JSON string will be auto-entered in the txt box
     * Parsing it to get the BNo or SNo props from the scanned text
     */
    try {
      if (typeof scannedValue !== "object") {
        return JSON.parse(scannedValue);
      } else {
        return scannedValue;
      }
    } catch (err) {
      return scannedValue;
    }
  };

  /**
   * Gets the parsed value from the QR Code & sends it to the parent comp.
   * @param {String}  value Value entered by the user or scanned from QR Code.
   */
  const handleScan = (value = "") => {
    // console.log("QRCodeScannerContainer - handleScan: ", value);
    // setWarningMsg("");
    /* If the user scans a code via in-built Cam, 'scannedValue' arg will have a valid value.
     * If a no. is manually entered this arg. will be empty in which case the value from the 'state'
     * is sent to the api
     */
    //If a QR Code scanner is used to scan the code, the Textbox is populated with JSON value that
    //is stored in teh qr code
    if (!value && scannedValue) {
      //Scanned via QR Code Reader
      value = parseScannedValue(scannedValue);
    } else {
      //Scanned via Cam Scanner
      value = parseScannedValue(value);
    }

    if (value) {
      setScannedValue("");
      handleQRCodeScan(value);
    } else {
      setWarningMsg("Invalid input!");
      return;
    }
  };

  useEffect(() => {
    setWarningMsg(message);
  }, [message]);

  return (
    <>
      <div>
        <small className="text-muted">{subTitle}</small>
        <Popover
          placement="left"
          isOpen={qrScannerPopover}
          hideArrow={true}
          target="qrScannerPopoverBtn"
          style={{ width: "250px", height: "320px" }}
          toggle={toggleComponent}
        >
          <h4 className="ml-3 mt-2">{title}</h4>
          <span
            className="text-primary"
            style={{ cursor: "pointer", position: "fixed", top: 7, right: 12 }}
            onClick={toggleComponent}
          >
            <i className="fa fa-times" />
          </span>
          <PopoverBody>
            <QRCodeScanner displayScanner={qrScannerPopover} getRecord={handleScan} />
          </PopoverBody>
        </Popover>
        <Row>
          <Col sm="4" md="3" className="text-left ml-0 mt-1">
            <span id="qrScannerPopoverBtn" className="icon icon-lg icon-shape cursor-pointer">
              {/* <i className="fas fa-qrcode text-dark" /> */}
              <img
                className="ml-4"
                style={{ height: "90px", width: "90px" }}
                src={require("assets/img/qr-code.png")}
                alt="QR Code"
              />
            </span>
          </Col>
          <Col sm="8" md="9">
            <FormGroup className="mt-1 mb-2">
              <Input
                autoFocus={autoFocus}
                bsSize="md"
                value={scannedValue}
                className={"form-control display-4 text-gray-dark"}
                id="input-batch-serial-no"
                placeholder={placeholder}
                onChange={handleValueChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleScan(scannedValue);
                  }
                }}
                disabled={displayMode !== displayModes.NORMAL}
              />
            </FormGroup>
          </Col>
        </Row>
        <Row className="ml-3 mt-2">
          {warningMsg && !isLoading && (
            <span className="text-warning mr-20 small">
              <i className="fa fa-exclamation-triangle" /> &nbsp;
              {warningMsg}
            </span>
          )}
        </Row>
      </div>
    </>
  );
};

export default QRCodeScannerContainer;
