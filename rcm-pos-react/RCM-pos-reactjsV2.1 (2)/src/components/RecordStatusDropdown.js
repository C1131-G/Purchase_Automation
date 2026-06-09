import React from "react";
import { Input } from "reactstrap";
import { recordStatusList } from "../config/config.js";

const RecordStatusDropdown = ({ name, value, handleChange, size = "sm" }) => {
  return (
    <>
      <small className="text-muted">Status</small>
      <Input
        type="select"
        bsSize={size}
        className="mt-1 form-control display-4 text-gray-dark"
        name={name}
        id={name}
        value={value}
        onChange={handleChange}
      >
        <option key="-" value="-">
          -- Select a Status --
        </option>
        {recordStatusList.map((status) => (
          <option key={status.code} value={status.code}>
            {status.name}
          </option>
        ))}
      </Input>
    </>
  );
};

export default RecordStatusDropdown;
