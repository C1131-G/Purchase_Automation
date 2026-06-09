import React from "react";
import { Card, CardBody } from "reactstrap";
import SvgIcon from "./SvgIcon";

const Widgets1 = ({ data }) => {
  return (
    <Card className="widget-1 border-0 shadow">
      <CardBody>
        <div className="widget-content">
          <div className={`widget-round ${data.color}`}>
            <div className="bg-round">
              <SvgIcon className="svg-fill" iconId={`${data.icon}`} />
              <SvgIcon className="svg-fill" /> {/** half-circle  */}
            </div>
          </div>
          <div>
            <h4 className="font-weight-700">{data.title}</h4>
            <span className="text-xs font-light">{data.subTitle}</span>
          </div>
        </div>
        {/* <div className={`font-${data.color} f-w-500`}>
          <i className={`icon-arrow-${data.gros < 50 ? "down" : "up"} icon-rotate me-1`} />
          <span>{`${data.gros < 50 ? "-" : "+"}${data.gros}%`}</span>
        </div> */}
      </CardBody>
    </Card>
  );
};

export default Widgets1;
