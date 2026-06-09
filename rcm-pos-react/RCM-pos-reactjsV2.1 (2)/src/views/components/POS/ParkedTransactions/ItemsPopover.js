import React, { useState } from "react";
import { Popover, PopoverBody, Table } from "reactstrap";

const ItemsPopover = (props) => {
  return (
    <>
      <span id={"popover-label" + props.index} className="text-info text-underline cursor-pointer">
        {props.label}
      </span>
      <Popover
        placement="left"
        trigger="hover" //this will take care of onMousehover
        hideArrow={false}
        isOpen={props.isOpen}
        target={"popover-label" + props.index}
        toggle={() => props.togglePopOver(props.index)}
      >
        <h4 className="ml-3 mt-2">{props.title}</h4>
        <PopoverBody>
          {/* <div style={{ maxHeight: "380px", overflowY: "auto" }}> */}
          <Table size="sm" className="ml--1 mt--2 mb-0 mr--1 table-sm">
            <thead className="thead-light">
              <tr className="border-top-secondary">
                <th scope="col">#</th>
                <th scope="col">Item Name</th>
                <th scope="col">Quantity</th>
                <th scope="col">Tax Local</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(props.items) && props.items.length > 0
                ? props.items.map((item, key) => {
                    return (
                      <tr key={item.ItemCode} id={"trId" + key}>
                        <td>{key + 1}</td>
                        <td className="text-info">{item.ItemName}</td>
                        <td>{item.Quantity}</td>
                        <td>{item.TaxLocal}</td>
                      </tr>
                    );
                  })
                : null}
            </tbody>
          </Table>
          {/* </div> */}
        </PopoverBody>
      </Popover>
    </>
  );
};

export default ItemsPopover;
