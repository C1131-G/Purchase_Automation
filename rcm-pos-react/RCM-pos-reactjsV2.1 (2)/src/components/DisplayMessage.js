import React from "react";
import { statusColors } from "../config/config";

const DisplayMessage = ({ className, type, iconSize, message, ...props }) => {
  //iconColor, fontSize
  const icons = {
    [statusColors.SUCCESS]: "fa-info-circle",
    [statusColors.INFO]: "fa-info-circle",
    [statusColors.PRIMARY]: "fa-info-circle",
    [statusColors.WARNING]: "fa-exclamation-triangle",
    [statusColors.DANGER]: "fa-exclamation-triangle",
  };

  const size = {
    xs: "small", //use this to hide the Icon
    sm: "text-sm",
  };

  let iconColor = props.iconColor ? props.iconColor : type;
  let fontColor = props.fontColor ? props.fontColor : type;

  return (
    <span className={className}>
      <span className={`mr-20`}>
        <i className={`text-${iconColor}  fa ${icons[type]} ${iconSize ? size[iconSize] : ""}`} />{" "}
        &nbsp;
        <small className={`text-${fontColor}`}>
          {typeof message === "string" ? message : String(message)}
        </small>
      </span>
    </span>
  );
};

export default DisplayMessage;
