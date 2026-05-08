import React from "react";

/**
 * SelectRootProps: Configuration for custom industrial-grade dropdowns.
 * STATE: Supports both controlled (`value`) and uncontrolled (`defaultValue`) patterns.
 */
export interface SelectRootProps {
  children: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  autoComplete?: string;
}

export interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

export interface SelectIconProps {
  children: React.ReactNode;
  className?: string;
}

export interface SelectPositionerProps {
  children: React.ReactNode;
  className?: string;
  side?: "top" | "bottom";
}

export interface SelectPopupProps {
  children: React.ReactNode;
  className?: string;
}

export interface SelectListProps {
  children: React.ReactNode;
  className?: string;
}

export interface SelectItemProps {
  value: string;
  label?: string | React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
}
