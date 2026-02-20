import React from 'react'

export type FormProps = React.FormHTMLAttributes<HTMLFormElement> & {
  errors?: Record<string, string>
}
