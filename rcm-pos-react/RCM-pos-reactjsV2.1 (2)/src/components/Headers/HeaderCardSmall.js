import React from "react";
import { CardHeader, Row, Col } from "reactstrap";

const HeaderCardSmall = ({ title, rightContent, className }) => {
  return (
    <>
      <CardHeader className={`${className ? className : " d-flex justify-content-between "}`}>
        <Row>
          <h4 className="ml-2 font-weight-700">{title}</h4>
          <div className="mr-2 d-flex justify-content-between ml-auto">
            {rightContent ? <>{rightContent}</> : ""}
          </div>
        </Row>
      </CardHeader>
    </>
  );
};

export default HeaderCardSmall;
