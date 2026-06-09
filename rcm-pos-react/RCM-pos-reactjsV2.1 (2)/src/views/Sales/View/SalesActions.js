import React, { useContext, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { Col, Row } from "reactstrap";
import { Pause, Play, RotateCcw } from "react-feather";
import {
  faPause,
  faPlay,
  faRotateLeft,
  faHomeAlt,
  faCartShopping,
} from "@fortawesome/free-solid-svg-icons";

import Widgets3 from "../../../components/Widgets3";
import {
  openCreateInvoicePage,
  openViewReturnsPage,
  openCreateReturnsPage,
  openHomePage,
} from "../../../util/navigation.js";
import { appPaths } from "../../../config/config.js";

const SalesActions = () => {
  const history = useHistory();
  const location = useLocation();

  const widgetList = [
    {
      title: "Invoice",
      subTitle: "New Items",
      color: "primary",
      size: "lg",
      icon: faCartShopping,
      onClick: openCreateInvoicePage,
      history,
    },
    {
      title: "View",
      subTitle: "Return Requests",
      color: "info",
      size: "lg",
      icon: faRotateLeft,
      onClick: openViewReturnsPage,
      history,
      // icon: "fa fa-rotate-left text-info",
      // icon: <RotateCcw />
    },
  ];

  return (
    <>
      <Row>
        {widgetList.map((widget) => {
          return (
            <Col>
              <Widgets3 data={widget} />
            </Col>
          );
        })}
      </Row>
    </>
  );
};

export default SalesActions;
