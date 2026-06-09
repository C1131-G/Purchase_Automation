import React from "react";
import { FormGroup, FormFeedback, Input } from "reactstrap";

const BaseDropdownStatic = ({
  index = null,
  record = null,
  valueField = null,
  labelField = null,
  name,
  value,
  options,
  placeholder = "Select a value",
  disabled = false,
  label,
  size = "sm",
  className = "",
  invalidMessage = null,
  handleChange,
}) => {
  /**
   * Conditionally change the params passed to the `handleChange`
   * @param {*} e
   */
  const onChangeHandler = (e) => {
    if (index !== null && record !== null) {
      handleChange(index, record, e); // when the dropdown is used within a table
    } else {
      handleChange(e);
    }
  };

  return (
    <>
      {label && <small className="text-muted">{label}</small>}
      <FormGroup className={`mt-1 ${className}`}>
        <Input
          type="select"
          bsSize={size}
          className={"mt-1 form-control display-4 text-gray-dark " + className}
          name={name}
          id={name}
          value={value}
          onChange={onChangeHandler}
          disabled={disabled}
          invalid={invalidMessage ? true : false}
        >
          <option key="-" value="">
            {placeholder}
          </option>
          {options.map((opt) => (
            <option
              key={valueField ? opt[valueField] : opt}
              value={valueField ? opt[valueField] : opt}
            >
              {labelField ? opt[labelField] : opt}
            </option>
          ))}
        </Input>
        <FormFeedback>{invalidMessage}</FormFeedback>
      </FormGroup>
    </>
  );
};

export default BaseDropdownStatic;
