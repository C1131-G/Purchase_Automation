export const checkPaymentFields = [
  // Fields WO label are added only for validation purpose
  {
    fieldName: "BankCode",
    validationMsg: "Select a Bank",
  },
  {
    md: "4",
    label: "Branch",
    fieldName: "Branch",
    placeholder: "Enter Branch Name",
    validationMsg: "Enter a valid Branch Name",
  },
  {
    md: "4",
    label: "Check/Voucher No.",
    fieldName: "CheckNumber",
    placeholder: "Enter Check/Voucher Number",
    validationMsg: "Enter a valid Check/Voucher No.",
  },
  {
    md: "4",
    label: "Account No.",
    fieldName: "AccounttNum",
    placeholder: "Enter Account Number",
    validationMsg: "Enter a valid Account No.",
  },
  {
    md: "4",
    label: "Issued by",
    fieldName: "OriginallyIssuedBy",
    placeholder: "Enter Issued by Bank Name",
    validationMsg: "Enter a valid Issued by Bank Name",
  },
];

export const getDefaultValues = () => {
  const defaultValues = {};
  checkPaymentFields.forEach((field) => {
    defaultValues[field.fieldName] = "";
  });
  return defaultValues;
};

export const getDefaultValidation = () => {
  const defaultValidation = {};
  checkPaymentFields.forEach((field) => {
    defaultValidation[field.fieldName] = false;
  });
  return defaultValidation;
};

export const getMandatoryFields = () => {
  let mandatoryFields = [];
  checkPaymentFields.forEach((field) => {
    if (field.validationMsg) {
      mandatoryFields.push(field);
    }
  });

  return mandatoryFields;
};

/**
 * Validates the form data
 * @param {*} formData
 * @returns appropriate Validation Msg if a mandatory field doesnt have a value
 */
export const validateCheckPaymentForm = (formData) => {
  const mandatoryFields = getMandatoryFields(); //["CardName", "Cellular"]; //"EmailAddress"
  console.log("validateForm - mandatoryFields: ", mandatoryFields);

  let validationMsg = "";
  for (let i = 0; i < mandatoryFields.length; i++) {
    console.log("mandatoryFields[i]: ", mandatoryFields[i]);
    if (!formData[mandatoryFields[i].fieldName]) {
      // setInvalidCustomerData({ ...invalidCustomerData, [mandatoryFields[i].fieldName]: true });
      validationMsg = mandatoryFields[i].validationMsg;
      break;
    }
  }
  return validationMsg;
};
