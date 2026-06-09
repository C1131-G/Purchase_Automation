import React from "react";
import { Input } from "reactstrap";

const CustomerManualAddressInput = ({ value, onChange, disabled = false }) => {
  const handleChange = (e) => {
    const address = e.target.value;
    onChange({ Address: address, Address2: address });
  };

  return (
    <Input
      size="sm"
      type="text"
      placeholder="Enter or edit address"
      value={value}
      onChange={handleChange}
      className="mt-1"
      disabled={disabled}
    />
  );
};

export default CustomerManualAddressInput;
