import React, { useContext } from "react";
import { Card, CardBody } from "reactstrap";
import { UserPermissionsContext } from "../../../contexts/UserPermissionsContext";
import { formatDate } from "../../../config/util";

const CounterInfo = () => {
  const { userName, userSessionLog } = useContext(UserPermissionsContext);

  return (
    <Card className="shadow">
      <CardBody className="text-sm">
        <div className="mb-2">
          <span className="text-gray">Counter# &emsp;: </span>&emsp;
          <span className="text-primary font-weight-700">{userSessionLog.counterName}</span>
        </div>
        <div className="mb-2">
          <span className="text-gray">Executive &emsp;: </span>&emsp;
          <span className="font-weight-700">{userName}</span>
        </div>
        <div>
          <span className="text-gray">Login Time &nbsp;: </span>&emsp;
          <span className="font-weight-700">
            {formatDate(userSessionLog.loginTime, "MMMM D, YYYY hh:mm")}
          </span>
        </div>
      </CardBody>
    </Card>
  );
};

export default CounterInfo;
