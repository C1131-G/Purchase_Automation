import {
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldRoot,
} from '@/components/ui/field-components'

// Field: Compound component for ERP form controls.
// Using this pattern to satisfy Fast Refresh while maintaining dot-notation.
export const Field = Object.assign(FieldRoot, {
  Root: FieldRoot,
  Label: FieldLabel,
  Control: FieldControl,
  Description: FieldDescription,
  Error: FieldError,
})
