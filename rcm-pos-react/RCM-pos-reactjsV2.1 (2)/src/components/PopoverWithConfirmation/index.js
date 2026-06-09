import React, { useState } from "react";
import { Popover, PopoverBody, Button } from "reactstrap";

const PopoverWithConfirmation = ({
  target,
  confirmationMsg,
  handleConfirmation,
  children,
  togglePopover,
  isOpen,
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);

  // const togglePopover = () => {
  //   setPopoverOpen(!popoverOpen);
  // };

  return (
    <>
      <Popover
        placement="top"
        target={target}
        isOpen={isOpen}
        toggle={() => togglePopover()}
        className="popover-warning"
      >
        <PopoverBody className="text-center">
          <p className="text-gray-dark text-xs text-center mb-2 font-weight-600">
            {confirmationMsg}
            Are you sure you want to continue?
          </p>
          <Button
            outline
            color="primary"
            onClick={() => {
              handleConfirmation();
              togglePopover();
            }}
            size="sm"
          >
            Yes
          </Button>
          <Button outline color="danger" onClick={togglePopover} size="sm">
            No
          </Button>
        </PopoverBody>
      </Popover>
      {children}
    </>
  );
};

export default PopoverWithConfirmation;
