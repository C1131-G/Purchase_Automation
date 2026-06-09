import React, { cloneElement } from "react";

const StyledIcon = (props) => {
  const { icon, color, ...res } = props;
  return (
    <div className={`styled-icon ${color}`}>
      <div className="style-box">
        {cloneElement(icon, { className: `text-${color}` })}
        {/* {icon} */}
      </div>
    </div>
  );
};

export default StyledIcon;
