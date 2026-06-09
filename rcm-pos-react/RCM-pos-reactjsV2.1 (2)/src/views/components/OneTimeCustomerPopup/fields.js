export const codNameField = "U_CODCntName";
export const codPhoneField = "U_CODTlePhone";
export const codAddressField = "U_CODAddress";

export const fields = [
  // Fields WO label are added only for validation purpose
  {
    md: "12",
    label: "Customer Name",
    fieldName: codNameField,
    placeholder: "Enter Customer Name",
    validationMsg: "Enter a valid Customer Name",
  },
  {
    md: "12",
    label: "Contact#",
    fieldName: codPhoneField,
    placeholder: "Enter Contact Number",
    validationMsg: "Enter a valid Contact Number",
  },
  {
    md: "12",
    label: "Email",
    fieldName: "U_CODEmail",
    placeholder: "Enter Email",
    // validationMsg: "Enter a valid Email"
  },
  {
    md: "12",
    label: "Address",
    fieldName: codAddressField,
    placeholder: "Enter Address",
    validationMsg: "Enter Address to proceed!",
  },
];

export const getDefaultValues = (fields) => {
  const defaultValues = {};
  fields.forEach((field) => {
    defaultValues[field.fieldName] = "";
  });
  return defaultValues;
};

export const getDefaultValidation = (fields) => {
  const defaultValidation = {};
  fields.forEach((field) => {
    defaultValidation[field.fieldName] = false;
  });
  return defaultValidation;
};

export const getMandatoryFields = (fields) => {
  let mandatoryFields = [];
  fields.forEach((field) => {
    if (field.validationMsg) {
      mandatoryFields.push(field);
    }
  });

  return mandatoryFields;
};

/**
 * Validates the form data
 * @param {*} fields
 * @param {*} formData Object with data entered by the user
 * @param {*} setInvalidData Function that marks the missing field as invalid
 * @returns appropriate Validation Msg if a mandatory field doesnt have a value
 */
export const validateForm = (fields, formData, isCODCustomer, setInvalidData) => {
  let mandatoryFields = getMandatoryFields(fields);
  mandatoryFields = mandatoryFields.filter((field) => {
    // Omit the Address field when !isCODCustomer
    // if (!isCODCustomer && field.fieldName === codAddressField) {

    // Omit the Name, Phone# & Address field when !isCODCustomer
    if (
      !isCODCustomer &&
      [codNameField, codPhoneField, codAddressField].includes(field.fieldName)
    ) {
      return false;
    }
    return true;
  });
  console.log("validateForm - mandatoryFields: ", mandatoryFields);

  let isValid = true;
  for (let i = 0; i < mandatoryFields.length; i++) {
    const field = mandatoryFields[i];
    const isFieldEmpty = !formData[field.fieldName];

    // Perform the validation for Address field only when `isCODCustomer` is true
    // OR if it's any other field
    if (isFieldEmpty) {
      setInvalidData({ [field.fieldName]: true });
      isValid = false;
      break;
    }
  }
  return isValid;
};
