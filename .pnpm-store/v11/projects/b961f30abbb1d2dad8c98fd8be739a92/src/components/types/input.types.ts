import React from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export type DebouncedInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  value: string | number;
  onChange: (value: string | number) => void;
  debounce?: number;
};
