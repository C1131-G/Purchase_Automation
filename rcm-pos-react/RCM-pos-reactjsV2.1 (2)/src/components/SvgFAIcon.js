import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const SvgFAIcon = (props) => {
  console.log("SvgFAIcon: ", JSON.stringify(props));
  const { icon, color, size, ...res } = props.data;
  return <FontAwesomeIcon icon={icon} size={size} className={`text-${color}`} />;
};

export default SvgFAIcon;
