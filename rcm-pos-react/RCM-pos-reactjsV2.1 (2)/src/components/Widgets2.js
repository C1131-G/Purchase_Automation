import React from "react";
import { Card, CardBody } from "reactstrap";
import SvgIcon from "./SvgIcon";
import StyledIcon from "./StyledIcon";

const Widgets2 = ({ data }) => {
  return (
    <Card className="widget-1 border-0 shadow">
      <CardBody>
        <div className="widget-content">
          <div className={`${data.color}`}>
            <div className="bg-round">
              <StyledIcon color={data.color} icon={data.icon} />
            </div>
          </div>
          <div>
            <h4 className="font-weight-700">{data.title}</h4>
            <span className="text-xs font-light">{data.subTitle}</span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default Widgets2;
