import React from "react";
import { Input } from "reactstrap";
import BaseDropdownStatic from "../BaseComponents/BaseDropdownStatic";

const IDProofsDropdown = ({
  label,
  name,
  value,
  handleChange,
  size = "sm",
  className = "",
  invalidMessage = "",
}) => {
  const labelField = "label";
  const valueField = "fieldName";

  const proofList = [
    { [labelField]: "Driving License No.", [valueField]: "U_License", maxLength: 6 },
    { [labelField]: "Fiji National Provident Fund No.", [valueField]: "U_FNPFNO", maxLength: 6 },
    { [labelField]: "TIN No.", [valueField]: "U_TINNO", maxLength: 9 },
    { [labelField]: "Voter Id", [valueField]: "U_VoterID", maxLength: 12 },
  ];

  const handleIdProofSelection = (e) => {
    const selectedID = e.target.value;
    console.log("selectedID: ", selectedID);
    const selectedRecord = proofList.find((item) => item[valueField] === selectedID);
    handleChange(e, selectedRecord);
  };

  return (
    <>
      <BaseDropdownStatic
        size={size}
        className={className}
        label={label}
        name={name}
        value={value}
        options={proofList}
        labelField={labelField}
        valueField={valueField}
        placeholder="Select an ID"
        handleChange={handleIdProofSelection}
        returnSelectedRecord={true}
        invalidMessage={invalidMessage}
      />
    </>
  );
};

export default IDProofsDropdown;
