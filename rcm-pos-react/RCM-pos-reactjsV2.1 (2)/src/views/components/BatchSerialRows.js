import React, { useState, useEffect } from "react";
import { displayModes, itemTypes, itemTypeProperties } from "../../config/config";
import { Input } from "reactstrap";
import { Trash2 } from "react-feather";

export default function BatchSerialRows(props) {
  let numberProp;
  if (props.itemType === itemTypes.BATCHES) {
    numberProp = itemTypeProperties.BATCH_NUMBER;
  } else if (props.itemType === itemTypes.SERIAL_NUMBERS) {
    numberProp = itemTypeProperties.SERIAL_NUMBER;
  }

  return (
    <>
      {props.batchSerialNumbers.map((batchSerial, key) => {
        return (
          <>
            {key === 0 ? (
              <tr key={0} style={{ backgroundColor: "#f6f8f9" }}>
                <td style={{ backgroundColor: "#fff" }}></td>
                <td style={{ backgroundColor: "#fff" }}></td>
                <td>
                  <b>{props.itemType === itemTypes.BATCHES ? "Batch#" : "Serial#"}</b>
                </td>
                <td>
                  <b>Quantity</b>
                </td>
                <td>
                  <b>From Bin Loc.</b>
                </td>
              </tr>
            ) : null}
            <tr key={batchSerial[numberProp]}>
              <td></td>
              <td>
                {props.operation === displayModes.CREATE && (
                  <Trash2
                    id={`batchSerial_${batchSerial.key}`}
                    size={20}
                    className="mr-1 pb-1 text-danger"
                    onClick={() =>
                      props.handleDeleteBatchSerial(props.itemType, props.itemKey, key)
                    }
                  />
                )}
              </td>
              <td>{batchSerial[numberProp]}</td>
              <td>
                {props.operation === displayModes.CREATE ? (
                  <Input
                    bsSize="sm"
                    style={{ width: 70 + "%" }}
                    value={batchSerial.Quantity}
                    className={"form-control"} // display-4 text-gray-dark
                    placeholder=""
                    type="number"
                    onChange={(e) =>
                      props.handleQuantityChange(props.itemType, e.target.value, props.itemKey, key)
                    }
                  />
                ) : (
                  parseFloat(batchSerial.Quantity).toFixed(2)
                )}
              </td>
              <td>{batchSerial.BinCode}</td>
            </tr>
          </>
        );
      })}
    </>
  );
}
