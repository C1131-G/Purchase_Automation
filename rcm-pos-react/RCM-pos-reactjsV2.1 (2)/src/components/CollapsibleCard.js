import React, { useState } from "react";
import { Card, CardHeader, CardBody } from "reactstrap";
import { ChevronUp, ChevronDown } from "react-feather";

const CollapsibleCard = ({ title, children }) => {
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  return (
    <Card>
      <CardHeader
        className="d-flex justify-content-between align-items-center"
        onClick={toggleCollapse}
      >
        <span>{title}</span>
        {collapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
      </CardHeader>
      {!collapsed && <CardBody>{children}</CardBody>}
    </Card>
  );
};

export default CollapsibleCard;
