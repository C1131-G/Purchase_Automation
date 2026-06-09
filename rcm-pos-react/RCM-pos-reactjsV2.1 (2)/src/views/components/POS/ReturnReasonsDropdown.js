import React from "react";
import { Input } from "reactstrap";
import BaseDropdownStatic from "../BaseComponents/BaseDropdownStatic";

const ReturnReasonsDropdown = ({
  index,
  item,
  name,
  value,
  handleChange,
  disabled,
  label,
  size = "sm",
  className = "",
}) => {
  const returnReasons = [
    "Item Damaged",
    "Changed mind",
    "Dissatisfaction with quality",
    "Ordered wrong item",
  ];
  return (
    <>
      <BaseDropdownStatic
        size={size}
        className={className}
        index={index}
        record={item}
        label={label}
        name={name}
        value={value}
        options={returnReasons}
        placeholder="Select a Reason"
        disabled={disabled}
        handleChange={handleChange}
      />
    </>
  );
};

export default ReturnReasonsDropdown;
