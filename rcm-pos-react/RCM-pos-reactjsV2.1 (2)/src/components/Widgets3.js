import React from "react";
import { Badge, Card, CardBody } from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const Widgets3 = ({ data }) => {
  return (
    <Card
      className="widget-1 border-0 shadow"
      onClick={data.onClick ? () => data.onClick(data.history) : undefined}
    >
      <CardBody>
        <div className="widget-content">
          <div className={`widget-round ${data.color}`}>
            <div className="bg-round">
              <FontAwesomeIcon icon={data.icon} size={data.size} className={`text-${data.color}`} />
            </div>
          </div>
          <div>
            <div className="mb-1">
              <span className="font-weight-700">{data.title}</span>
              {!isNaN(data.count) ? (
                <Badge
                  className="badge-circle badge-floating border-white" //
                  color="success"
                  size="lg"
                >
                  {data.count}
                </Badge>
              ) : null}
            </div>
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

export default Widgets3;
