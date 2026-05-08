import {
  SelectIcon,
  SelectItem,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectRoot,
  SelectTrigger,
  SelectValue,
} from "@/components/select/select-components";

// Select: Compound component for high-precision dropdowns.
export const Select = Object.assign(SelectRoot, {
  Icon: SelectIcon,
  Item: SelectItem,
  List: SelectList,
  Popup: SelectPopup,
  Portal: SelectPortal,
  Positioner: SelectPositioner,
  Root: SelectRoot,
  Trigger: SelectTrigger,
  Value: SelectValue,
});
