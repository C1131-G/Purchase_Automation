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

import Widgets3 from "../../components/Widgets3";
import {
  openCreateInvoicePage,
  openViewReturnsPage,
  openCreateReturnsPage,
  openHomePage,
} from "../../util/navigation.js";
import { appPaths } from "../../config/config.js";

const ReturnsActions = () => {
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
      title: "Return",
      subTitle: "Purchased Items",
      color: "warning",
      size: "lg",
      icon: faRotateLeft,
      onClick: openCreateReturnsPage,
      history,
      // icon: "fa fa-rotate-left text-info",
      // icon: <RotateCcw />
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
    // {
    //   title: "Home",
    //   subTitle: "Return To",
    //   color: "info",
    //   size: "lg",
    //   icon: faHomeAlt,
    //   onClick: openHomePage,
    //   history
    // }

    // TODO: Add widget to view Returns. View, Filter & see the Items under Return reqs.
  ];

  return (
    <>
      {/* <Col xxl="auto" xl="6" sm="6" className="box-col-6"> */}
      <Row>
        {widgetList.map((widget) => {
          //Hide `Sales` widget when in Sales page, likewise hide `Returns` widget in Returns page
          if (
            !(location.pathname === appPaths.INVOICE && widget.title === "Invoice") &&
            !(
              location.pathname === appPaths.CREATE_RETURNS &&
              widget.title === "Return" &&
              widget.subTitle === "Purchased Items"
            ) &&
            !(
              location.pathname === appPaths.VIEW_RETURNS &&
              widget.title === "View" &&
              widget.subTitle === "Return Requests"
            )
          ) {
            return (
              <Col>
                <Widgets3 data={widget} />
              </Col>
            );
          }
        })}
      </Row>
    </>
  );
};

export default ReturnsActions;
