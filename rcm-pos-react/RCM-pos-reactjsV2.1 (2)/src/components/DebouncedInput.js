import React, { useState, useEffect } from "react";
import { Input, InputGroup, InputGroupAddon, InputGroupText } from "reactstrap";

export default function DebouncedInput(props) {
  const size = {
    sm: "1.10em",
    md: "1.55em",
    lg: "1.85em",
  };

  const [value, setValue] = useState(""); //props.value !== undefined ? props.value : ""
  const [iconSize, setIconSize] = useState(props.iconSize ? size[props.iconSize] : size.sm);

  useEffect(() => {
    const timer = setTimeout(() => props.onChange(value), props.delayInMilliseconds);
    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    if (props.value !== undefined && props.value !== value) {
      setValue(props.value);
    }
  }, [props.value]);

  return (
    <InputGroup size={props.bsSize}>
      {props.icon && props.addonType === "prepend" && (
        <InputGroupAddon addonType="prepend" className={props.invalid ? "is-invalid" : ""}>
          <InputGroupText>
            <i className={props.icon} style={{ fontSize: iconSize }} />
          </InputGroupText>
        </InputGroupAddon>
      )}
      <Input
        // bsSize={props.bsSize}
        readOnly={props.readOnly}
        style={props.style}
        className={props.className}
        id={props.id}
        placeholder={props.placeholder}
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        invalid={props.invalid}
      />
      {props.icon && props.addonType === "append" && (
        <InputGroupAddon addonType="append" className={props.invalid ? "is-invalid" : ""}>
          <InputGroupText>
            <i className={props.icon} style={{ fontSize: "1.85em", color: "black" }} />
          </InputGroupText>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
