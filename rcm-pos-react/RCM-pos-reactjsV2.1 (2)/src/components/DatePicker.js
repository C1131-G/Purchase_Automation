import React from "react";
import { FormGroup, InputGroup } from "reactstrap";
import ReactDatetime from "react-datetime";
import "react-datetime/css/react-datetime.css";

const DatePicker = ({
  value,
  handleChange,
  isValidDate,
  inputProps,
  dateFormat = "MMMM D, YYYY",
}) => {
  return (
    <FormGroup className="mt-1">
      <InputGroup className="form-control form-control-sm">
        <i className="ni ni-calendar-grid-58 mt-1" />
        <ReactDatetime
          inputProps={{
            className: "text-gray-dark mr-3 ml-2 mt--5 border-0 cursor-pointer",
            readOnly: true,
            ...inputProps,
          }}
          value={value}
          onChange={handleChange}
          isValidDate={isValidDate}
          timeFormat={false}
          dateFormat={dateFormat}
          closeOnSelect={true}
        />
      </InputGroup>
    </FormGroup>
  );
};

export default DatePicker;
