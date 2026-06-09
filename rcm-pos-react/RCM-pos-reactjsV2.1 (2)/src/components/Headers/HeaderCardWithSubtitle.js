import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
// reactstrap components
import { Card, Row, Col, CardHeader, CardBody, Spinner } from "reactstrap";
import DisplayMessage from "../../components/DisplayMessage";
import { displayModes, statusColors } from "../../config/config";

/**
 * USAGE: This component must be placed inside the `<Card>` component, right above `<CardBody>`
 * @param {*} props `title, rightContent`
 */
const HeaderCardWithSubtitle = ({ title, subTitle, displayMode, isLoading, rightContent }) => {
  return (
    <CardHeader className="border-bottom mb--2">
      <Row className="align-items-center mb--2 mt--1">
        <Col md="6">
          {title ? <h4 className="mb-1.5 font-weight-700">{title}</h4> : null}
          <DisplayMessage type={statusColors.PRIMARY} message={subTitle} iconSize={"sm"} />{" "}
          {/** fontColor="darkgray" */}
        </Col>
        <Col className="text-right" md="6">
          {rightContent}
        </Col>
      </Row>
    </CardHeader>
  );
};

export default HeaderCardWithSubtitle;
