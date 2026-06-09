import React from "react";
// reactstrap components
import { Button, Popover, PopoverBody } from "reactstrap";
import { Trash2 } from "react-feather";

const DeleteWithConfirmation = ({
  targetId,
  popoverOpen,
  popoverPlacement,
  iconSize,
  index,
  className = "",
  ...props
}) => {
  //handleDelete, togglePopover

  //`index` prop added for using with array of elements
  const togglePopover = () => {
    console.log("DeleteWithConfirmation - togglePopover - key: ", index);
    props.togglePopover(index);
  };

  const handleDelete = () => {
    props.handleDelete(index);
  };

  return (
    <>
      <Popover
        placement={popoverPlacement}
        target={`pop_${targetId}`}
        className="popover-warning"
        isOpen={popoverOpen}
      >
        <PopoverBody className="text-center">
          <span className="text-gray-dark text-xs mb-2 font-weight-600">
            Are you sure you want to delete?
          </span>{" "}
          <br />
          <Button outline color="primary" onClick={handleDelete} size="sm">
            Yes
          </Button>
          <Button outline color="danger" onClick={togglePopover} size="sm">
            No
          </Button>
        </PopoverBody>
      </Popover>
      <Trash2
        id={`pop_${targetId}`}
        size={iconSize}
        className={"mr-1 pb-1 text-danger cursor-pointer " + className}
        onClick={togglePopover}
      />
    </>
  );
};

export default DeleteWithConfirmation;
