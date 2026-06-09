import React, { useState, useEffect } from "react";
import { Input, FormGroup, FormFeedback } from "reactstrap";
import { displayModes } from "../../config/config";

/**
 *
 * @param {*} props `label, fieldName, value, type="text", rows, displayMode, invalidMessage, handleChange`
 */
const InputWithLabel = ({
  label,
  fieldName,
  value,
  bsSize = "sm",
  type = "text",
  rows,
  placeholder,
  maxLength = undefined,
  displayMode = displayModes.EDIT,
  invalidMessage,
  className = "",
  handleChange,
}) => {
  // console.log("invalidMessage: ", JSON.stringify(invalidMessage));
  // const[invalidMessage, setInvalidMessage] = useState("");
  // useEffect(() => {
  //   setInvalidMessage(props.invalidMessage);
  // }, [props.invalidMessage])

  return (
    <>
      {label && <small className="text-muted">{label}</small>}
      {displayMode === displayModes.VIEW ? (
        <h4 className="mt-1">{value}</h4>
      ) : (
        <FormGroup className={`mt-1 ${className}`}>
          <Input
            bsSize={bsSize}
            value={value}
            maxLength={maxLength}
            className={"form-control display-4 text-gray-dark "}
            name={fieldName}
            placeholder={placeholder}
            type={type}
            rows={rows}
            onChange={handleChange}
            // disabled={displayMode === displayModes.EDIT ? false : true}
            invalid={invalidMessage ? true : false}
          />
          <FormFeedback>{invalidMessage}</FormFeedback>
        </FormGroup>
      )}
    </>
  );
};

export default InputWithLabel;
