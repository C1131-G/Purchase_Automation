import React from "react";
import { Card, CardBody, Row, Col } from "reactstrap";
import { formatDate } from "../../../config/util.js";

const HeaderDateTermsCard = ({ selectedRecord }) => {
  return (
    <>
      <Card className="shadow">
        <CardBody className="text-sm">
          <div className="mb-3 row">
            <span className="text-gray col-md-4">Valid Until</span>&emsp;
            <span className="font-weight-700">
              : {formatDate(selectedRecord?.DocDueDate, "MMMM D, YYYY")}
            </span>
          </div>
        </CardBody>
      </Card>
    </>
  );
};

export default HeaderDateTermsCard;
