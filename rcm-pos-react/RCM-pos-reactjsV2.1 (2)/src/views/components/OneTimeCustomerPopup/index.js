import React, { useState, useEffect } from "react";
import {
  Popover,
  PopoverHeader,
  PopoverBody,
  Button,
  Col,
  CustomInput,
  FormGroup,
  Label,
  Input,
} from "reactstrap";

import InputWithLabel from "../../../components/Input/InputWithLabel.js";
import { displayModes } from "../../../config/config.js";
import { fields, getDefaultValues, getDefaultValidation, validateForm } from "./fields.js";
import IDProofsDropdown from "../POS/IDProofsDropdown.js";

const OneTimeCustomerPopover = ({
  setCustomer,
  isOneTimeCustomer,
  setIsOneTimeCustomer,
  checkboxLabel,
  enableCODCustomer = false,
  isCODCustomer,
  setIsCODCustomer,
  oneTimeCustomerDetails,
  setOneTimeCustomerDetails,
  setCustomerAddress,
  setInvoiceResponse,
  isEditQuotation,
  popoverPlacement = "bottom",
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isDetailsSaved, setIsDetailsSaved] = useState(false);
  const [customer, setOTCustomer] = useState(getDefaultValues(fields));
  const [invalidData, setInvalidData] = useState(getDefaultValidation(fields));
  const [selectedIDProof, setSelectedIDProof] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setOTCustomer((prevState) => ({ ...prevState, [name]: value }));
    setInvalidData({ ...invalidData, [name]: false });
  };

  const handleIDProofChange = (e, selectedIDProof) => {
    console.log("selectedIDProof: ", selectedIDProof);
    if (selectedIDProof) {
      setSelectedIDProof(selectedIDProof);
      setInvalidData({ idProof: false });
    } else {
      setSelectedIDProof("");
    }
  };

  /**
   * Additional validations for ID Proof field
   * @returns
   */
  const validateID = (isCODCustomer) => {
    // Ignore ID validation for non-COD Customers
    if (!isCODCustomer) {
      return true;
    }

    if (!selectedIDProof || !selectedIDProof?.fieldName) {
      setInvalidData({ idProof: true });
      return false;
    } else if (!customer[selectedIDProof.fieldName]) {
      setInvalidData({ [selectedIDProof.fieldName]: true });
      return false;
    }
    return true;
  };

  // Reset ID Proof whenever the COD checkbox is changed
  useEffect(() => {
    setSelectedIDProof("");
  }, [isCODCustomer]);

  const handleSave = () => {
    if (
      validateForm(fields, customer, isCODCustomer, setInvalidData) &&
      validateID(isCODCustomer)
    ) {
      // Storing ID details to `context`, which will be saved to LS when `Pausing` a trx & restored when `Resuming` a Trx
      const updatedCustomer = { ...customer };
      if (isCODCustomer) {
        updatedCustomer.selectedIDProof = selectedIDProof;
      }
      setIsDetailsSaved(true);
      setOneTimeCustomerDetails({ ...oneTimeCustomerDetails, ...updatedCustomer });
      setInvoiceResponse("");
      setPopoverOpen(false);
    }
  };

  const handleClose = () => {
    // Clear the textboxes when the user cancels the popover WO saving the details
    if (!isDetailsSaved) {
      setOTCustomer(getDefaultValues(fields));
      setInvalidData(getDefaultValidation(fields));
    }
    setPopoverOpen(false);
    // setIsOneTimeCustomer(false);
  };

  useEffect(() => {
    if (!isEditQuotation) {
      setPopoverOpen(isOneTimeCustomer);

      // Remove selected `Customer` info when OTC checkbox is checked
      if (isOneTimeCustomer) {
        setCustomer("");
        setCustomerAddress("");
        setInvoiceResponse("");
      }
    } else {
      setPopoverOpen(false);
    }
  }, [isOneTimeCustomer, isEditQuotation]);

  // Remove local state var. when the OTC Details are empty (which will be the case when a `Customer` is selected via search)
  useEffect(() => {
    if (!oneTimeCustomerDetails) {
      setOTCustomer("");
      setInvoiceResponse("");
    }
    // Used when resuming a Paused trx
    else {
      setOTCustomer(oneTimeCustomerDetails);
      if (isCODCustomer && oneTimeCustomerDetails.selectedIDProof) {
        setSelectedIDProof(oneTimeCustomerDetails.selectedIDProof);
      }
    }
  }, [oneTimeCustomerDetails]);

  return (
    <div>
      {/* <FormGroup check>
        <Label check>
          <Input type="checkbox" checked={isOneTimeCustomer} onChange={() => setIsOneTimeCustomer(!isOneTimeCustomer)} />
          One Time Customer
        </Label>
      </FormGroup> */}
      <CustomInput
        inline
        bsSize="xs"
        id="oneTimeCustomerCheckbox"
        type="checkbox"
        label={checkboxLabel ? checkboxLabel : "One time Customer"}
        className="text-muted mt--0 custom-control-label-sm"
        checked={isOneTimeCustomer}
        onChange={() => setIsOneTimeCustomer(!isOneTimeCustomer)}
        disabled={isEditQuotation}
        // onChange={handleFieldChange}
      />
      <Popover
        placement={popoverPlacement}
        isOpen={popoverOpen}
        target="oneTimeCustomerCheckbox"
        // toggle={() => setPopoverOpen(!popoverOpen)} // commented to block the popover from opening when checkbox is disabled
      >
        <PopoverHeader className="text-primary text-center">
          {isCODCustomer ? "Enter COD Customer Details" : "Enter One Time Customer Details"}
        </PopoverHeader>
        {/* <h4 className="ml-3 mt-2">Enter One Time Customer Details</h4> */}
        <PopoverBody>
          <div style={{ width: "350px" }}>
            {enableCODCustomer && (
              <Col className="mb-2">
                <CustomInput
                  inline
                  bsSize="xs"
                  id="codCustomerCheckbox"
                  type="checkbox"
                  label={"COD Customer"}
                  className="text-info font-weight-600 mt--0 custom-control-label-sm"
                  checked={isCODCustomer}
                  onChange={() => setIsCODCustomer(!isCODCustomer)}
                  // onChange={handleFieldChange}
                />
              </Col>
            )}
            {/* Display the Address field only when COD Customer is enabled */}
            {fields.map(
              (field) =>
                (isCODCustomer || field.label !== "Address") && (
                  <Col md={field.md} key={field.fieldName} className="mb--3">
                    <InputWithLabel
                      bsSize="md"
                      type="text"
                      rows
                      label={field.label}
                      fieldName={field.fieldName}
                      value={customer[field.fieldName]}
                      placeholder={field.placeholder}
                      displayMode={displayModes.EDIT}
                      invalidMessage={invalidData[field.fieldName] ? field.validationMsg : ""}
                      handleChange={handleChange}
                    />
                  </Col>
                ),
            )}
            {isCODCustomer && (
              <>
                <Col className="pb--2">
                  <IDProofsDropdown
                    size="md"
                    label={"ID"}
                    name={"idProof"}
                    value={selectedIDProof.fieldName}
                    handleChange={handleIDProofChange}
                    invalidMessage={invalidData.idProof ? "Select an ID" : ""}
                  />
                </Col>
                {selectedIDProof && selectedIDProof?.fieldName && (
                  <Col md={12}>
                    <InputWithLabel
                      bsSize="md"
                      type="text"
                      rows
                      label={`${selectedIDProof.label} (${selectedIDProof?.maxLength} Digits)`}
                      fieldName={selectedIDProof.fieldName}
                      value={customer[selectedIDProof.fieldName]}
                      maxLength={selectedIDProof?.maxLength}
                      placeholder={"Enter " + selectedIDProof.label}
                      displayMode={displayModes.EDIT}
                      invalidMessage={
                        invalidData[selectedIDProof.fieldName]
                          ? `Enter Valid ID. Max. length ${selectedIDProof?.maxLength} `
                          : ""
                      }
                      handleChange={handleChange}
                    />
                  </Col>
                )}
              </>
            )}
            <div className="d-flex justify-content-center mt-2 mb-3">
              <Button color="success" size="md" onClick={handleSave}>
                Save
              </Button>
              {!isCODCustomer && (
                <Button color="danger" size="md" onClick={handleClose} className="ml-2">
                  Close
                </Button>
              )}
            </div>
          </div>
        </PopoverBody>
      </Popover>
    </div>
  );
};

export default OneTimeCustomerPopover;
