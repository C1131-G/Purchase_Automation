import React from "react";

const SvgIcon = (props) => {
  const { iconId, ...res } = props;
  return (
    <i className={iconId} />
    // <svg {...res}>
    //   <use href={`../assets/svg/sprite.svg#${iconId}`}></use>
    // </svg>
  );
};

export default SvgIcon;
