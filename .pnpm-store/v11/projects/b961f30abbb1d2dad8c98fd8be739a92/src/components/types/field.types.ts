import React from "react";

export interface FieldRootProps {
  children: React.ReactNode;
  error?: string;
  className?: string;
}

export type FieldLabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export interface FieldControlRenderProps {
  id: string;
  "aria-describedby": string;
  "aria-invalid": boolean;
}

export type FieldControlProps = React.HTMLAttributes<HTMLElement>;

export type FieldDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

export type FieldErrorProps = React.HTMLAttributes<HTMLParagraphElement>;
