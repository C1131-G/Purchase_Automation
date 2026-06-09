import React, { useState, useContext } from "react";
import { Card, Row, Col, FormGroup, Label, FormFeedback, Input } from "reactstrap";
import CustomModal from "../../../components/CustomModal";
import { useEffect } from "react";
import InputWithLabel from "../../../components/Input/InputWithLabel";
import { displayModes, statusColors, countryCode, customerTypes } from "../../../config/config";
import { createBusinessPartner } from "../../../helper/customer";
import ToastMessage from "../../../components/ToastMessage";

const CreateCustomerModal = (props) => {
  const recordType = {
    CUSTOMER: "CUSTOMER",
    ADDRESS: "ADDRESS",
  };

  const customerTypeField = "U_CustomerType";

  const customerFields = [
    {
      md: "4",
      label: "Name",
      fieldName: "CardName",
      placeholder: "Enter Customer Name",
      validationMsg: "Enter a valid Customer Name",
    },
    {
      md: "4",
      label: "Contact#",
      fieldName: "Cellular",
      placeholder: "Enter Contact#",
      validationMsg: "Enter a valid Contact#",
    },
    {
      md: "4",
      label: "Mail Id",
      fieldName: "EmailAddress",
      placeholder: "Enter Mail Id (optional)",
    },
    {
      md: "4",
      label: "Account Number",
      fieldName: "U_AccountNumber",
      placeholder: "Enter Account#",
      validationMsg: "Enter a valid Account#",
    },
  ];

  const addressFields = [
    {
      md: "4",
      label: "Building/Floor/Door#",
      fieldName: "BuildingFloorRoom",
      placeholder: "Enter Door#, Floor & Building",
      validationMsg: "Enter valid details",
    },
    {
      md: "4",
      label: "Street",
      fieldName: "Street",
      placeholder: "Enter Street",
      validationMsg: "Enter a valid Street",
    },
    // {
    //   md:"4",
    //   label: "Zip Code",
    //   fieldName: "ZipCode",
    //   placeholder: "Enter ZipCode",
    //   validationMsg: "Enter a valid ZipCode"
    // },
    {
      md: "4",
      label: "City",
      fieldName: "City",
      placeholder: "Enter City",
      validationMsg: "Enter a valid City",
    },
    {
      md: "4",
      label: "TIN",
      fieldName: "FederalTaxID",
      placeholder: "Enter TIN",
      validationMsg: "Enter a valid TIN",
    },
    // {
    //   md:"4",
    //   label: "Country",
    //   fieldName: "Country",
    //   placeholder: "Enter Country",
    //   validationMsg: "Enter a valid Country"
    // }
  ];

  const getDefaultValues = (type) => {
    const defaultValues = {};
    let fields;
    if (type === recordType.CUSTOMER) {
      fields = customerFields;
    } else {
      fields = addressFields;
    }
    fields.forEach((field) => {
      defaultValues[field.fieldName] = "";
    });
    return defaultValues;
  };

  const getDefaultValidation = (type) => {
    const defaultValidation = {};
    let fields;
    if (type === recordType.CUSTOMER) {
      fields = customerFields;
    } else {
      fields = addressFields;
    }
    fields.forEach((field) => {
      defaultValidation[field.fieldName] = false;
    });
    return defaultValidation;
  };

  const getMandatoryFields = (type) => {
    let fields,
      mandatoryFields = [];
    if (type === recordType.CUSTOMER) {
      fields = customerFields;
    } else {
      fields = addressFields;
    }

    fields.forEach((field) => {
      if (field.validationMsg) {
        mandatoryFields.push(field.fieldName);
      }
    });

    return mandatoryFields;
  };

  const defaultCustomerValues = getDefaultValues(recordType.CUSTOMER);
  const [customer, setCustomer] = useState({
    ...defaultCustomerValues,
    [customerTypeField]: customerTypes.B2B,
  });
  const [invalidCustomerData, setInvalidCustomerData] = useState(
    getDefaultValidation(recordType.CUSTOMER),
  );

  // const defaultValidation = { CardName: false, Cellular: false }; //, EmailAddress: false
  const [address, setAddress] = useState(getDefaultValues(recordType.ADDRESS));
  const [invalidAddressData, setInvalidAddressData] = useState(
    getDefaultValidation(recordType.ADDRESS),
  );
  // const [validationMsg, setValidationMsg] = useState();
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [warningMsg, setWarningMsg] = useState("");

  const closeModal = () => {
    // setSuccessMsg("");
    setWarningMsg("");
    setSuccessMsg("");
    // Set the CustomerType b4 closing. Will be used when creating a new customer
    setCustomer({ ...defaultCustomerValues, [customerTypeField]: customerTypes.B2B });
    setInvalidCustomerData(getDefaultValidation(recordType.CUSTOMER));

    setAddress(getDefaultValues(recordType.ADDRESS));
    setInvalidAddressData(getDefaultValidation(recordType.ADDRESS));
    props.closeModal();
  };

  const handleChange = (e) => {
    setCustomer({
      ...customer,
      [e.target.name]: e.target.value,
    });
    setInvalidCustomerData({ ...invalidCustomerData, [e.target.name]: false });
  };

  const handleAddressChange = (e) => {
    setAddress({
      ...address,
      [e.target.name]: e.target.value,
    });
    setInvalidAddressData({ ...invalidAddressData, [e.target.name]: false });
  };

  const validateForm = () => {
    const customerFields = getMandatoryFields(recordType.CUSTOMER); //["CardName", "Cellular"]; //"EmailAddress"
    console.log("validateForm - customerFields: ", customerFields);

    if (!customer[customerTypeField]) {
      setInvalidCustomerData({ [customerTypeField]: true });
      return false;
    }

    let isValid = true;
    for (let i = 0; i < customerFields.length; i++) {
      console.log("customerFields[i]: ", customerFields[i]);
      console.log("customer[customerFields[i]]: ", customer[customerFields[i]]);
      if (!customer[customerFields[i]]) {
        setInvalidCustomerData({ ...invalidCustomerData, [customerFields[i]]: true });
        isValid = false;
        break;
      }
    }
    if (isValid) {
      const addressFields = getMandatoryFields(recordType.ADDRESS);
      for (let i = 0; i < addressFields.length; i++) {
        console.log("addressFields[i]: ", addressFields[i]);
        console.log("address[addressFields[i]]: ", address[addressFields[i]]);
        if (addressFields[i] === "FederalTaxID") {
          // TIN is mandatory ONLY for B2B customers
          if (customer[customerTypeField] === customerTypes.B2B && !address[addressFields[i]]) {
            setInvalidAddressData({ ...invalidAddressData, [addressFields[i]]: true });
            isValid = false;
            break;
          }
        } else if (!address[addressFields[i]]) {
          setInvalidAddressData({ ...invalidAddressData, [addressFields[i]]: true });
          isValid = false;
          break;
        }
      }
    }
    return isValid;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      console.log("handleSubmit - request: ", JSON.stringify(request));
      setInvalidCustomerData(getDefaultValidation(recordType.CUSTOMER));
      setInvalidAddressData(getDefaultValidation(recordType.ADDRESS));
      setIsLoading(true);

      const request = {
        ...customer,
        // Set the Financially Active flag as `N` for B2B customers
        U_Fin_Status: customer[customerTypeField] === customerTypes.B2B ? "N" : "Y",
        Country: countryCode,
        CardCode: customer.Cellular,
        CardType: "cCustomer",
        BPAddresses: [
          {
            ...address,
            AddressName: "Shipping Address",
            AddressType: "bo_ShipTo",
          },
          {
            ...address,
            AddressName: "Billing Address",
            AddressType: "bo_BillTo",
          },
        ],
      };

      try {
        const response = await createBusinessPartner(request);
        // console.log("response.CardCode: ", response.CardCode);
        setSuccessMsg("Customer created successfully");

        //Set the new customer to `context`
        props.setCustomerInfo({
          CardName: request.CardName,
          Cellular: request.Cellular,
          U_Fin_Status: request.U_Fin_Status,
        });
        setIsLoading(false);
        closeModal();
      } catch (err) {
        setIsLoading(false);
        setWarningMsg(
          err.response && err.response.data.message
            ? err.response.data.message
            : JSON.stringify(err),
        );
      }
    }
  };

  useEffect(() => {
    if (props.newCustomer && (props.newCustomer.CardName || props.newCustomer.Cellular)) {
      setCustomer({
        CardName: props.newCustomer.CardName,
        Cellular: props.newCustomer.Cellular,
      });
    }
  }, [props.newCustomer]);

  return (
    <>
      <CustomModal
        modalSize="lg"
        buttonSize="md"
        isOpen={props.isOpen}
        title={"Create Customer"}
        infoMessage={"Enter Customer details & submit the form."}
        warningMsg={warningMsg}
        successMsg={successMsg}
        isLoading={isLoading}
        handleSubmit={handleSubmit}
        closeModal={closeModal}
      >
        <Card className="shadow px-3 py-2">
          <Row>
            {/* Disable B2C Customer Creation. */}
            <Col md="4">
              <small className="text-muted">Customer Type</small>
              <h4 className="mt-1 text-gray-dark">{customer.U_CustomerType}</h4>
              {/* <FormGroup className="mt-1">
              <Input
                bsSize="sm"
                // style={{width: 150+"px"}}
                type="select"
                name={customerTypeField}
                value={customer.U_CustomerType}
                onChange={handleChange}
                invalid={invalidCustomerData[customerTypeField]}
              >
                <option value="">Select a Type</option>
                <option value={customerTypes.B2C}>{customerTypes.B2C}</option>
                <option value={customerTypes.B2B}>{customerTypes.B2B}</option>
              </Input>
              <FormFeedback>Select a Customer Type</FormFeedback>
            </FormGroup> */}
            </Col>
            {/* <div className="custom-control custom-radio mb-2">
              <input
                id={customerTypes.B2C}
                checked={customer.U_CustomerType === customerTypes.B2C}
                className="custom-control-input"
                name={customerTypeField}
                type="radio"
              />
              <label className="custom-control-label" U_CustomerTypehtmlFor={customer.CustomerType === customerTypes.B2C}>
                {customerTypes.B2C}
              </label>
            </div>
            <div className="custom-control custom-radio mb-2">
              <input
                id={customerTypes.B2B}
                checked={customer.U_CustomerType === customerTypes.B2B}
                className="custom-control-input"
                name={customerTypeField}
                type="radio"
              />
              <label className="custom-control-label" htmlFor={customer.CustomerType === customerTypes.B2B}>
                {customerTypes.B2B}
              </label>
            </div> */}

            {customerFields.map((field) => {
              return (
                <Col md={field.md}>
                  <InputWithLabel
                    bsSize="sm"
                    type="text"
                    rows
                    label={field.label}
                    fieldName={field.fieldName}
                    value={customer[field.fieldName]}
                    placeholder={field.placeholder}
                    displayMode={displayModes.EDIT}
                    invalidMessage={invalidCustomerData[field.fieldName] ? field.validationMsg : ""}
                    handleChange={handleChange}
                  />
                </Col>
              );
            })}

            {/* <Col>
            <small className="text-muted">{field.label}</small>
            <FormGroup className="mt-1">
              <Input
                bsSize="sm"
                type="text"
                className="form-control display-4 text-gray-dark"
                name={field.fieldName}
                value={customer[field.fieldName]}
                onChange={handleChange}
                placeholder={field.placeholder}
                invalid={invalidCustomerData[field.fieldName]}
              />
              {field.validationMsg && <FormFeedback>{field.validationMsg}</FormFeedback>}
            </FormGroup>
          </Col> */}
          </Row>
        </Card>
        <h6 className="heading-small text-muted mt-2 pl-1">Address</h6>
        <Card className="shadow px-3 py-2 mt-2">
          <Row>
            {addressFields.map((field) => {
              return (
                <Col md={field.md}>
                  <InputWithLabel
                    bsSize="sm"
                    type="text"
                    rows
                    label={field.label}
                    fieldName={field.fieldName}
                    value={address[field.fieldName]}
                    placeholder={field.placeholder}
                    displayMode={displayModes.EDIT}
                    invalidMessage={invalidAddressData[field.fieldName] ? field.validationMsg : ""}
                    handleChange={handleAddressChange}
                  />
                </Col>
              );
            })}
          </Row>
        </Card>
      </CustomModal>
      {successMsg ? <ToastMessage type={statusColors.SUCCESS} message={successMsg} /> : null}
    </>
  );
};

export default CreateCustomerModal;
