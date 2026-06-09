import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
// reactstrap components
import { Card, Row, Col, CardHeader, CardBody, Spinner } from "reactstrap";
import DisplayMessage from "../../components/DisplayMessage";
import { displayModes, statusColors } from "../../config/config";

const CardWithHeader = ({ title, subTitle, displayMode, isLoading, rightContent, children }) => {
  return (
    <Card className="bg-white shadow">
      <CardHeader className="border-bottom mb--2">
        <Row className="align-items-center mb--2 mt--1">
          <Col md="6">
            {title ? <h4 className="mb-1.5">{title}</h4> : null}
            <DisplayMessage type={statusColors.INFO} message={subTitle} iconSize={"sm"} />{" "}
            {/** fontColor="darkgray" */}
          </Col>
          <Col className="text-right" md="6">
            {rightContent}
          </Col>
        </Row>
      </CardHeader>
      <CardBody className="mt--2 mb--3">
        {" "}
        {/** shadow */}
        <Row className="mt-2 pb-2">{children}</Row>
      </CardBody>
    </Card>
  );
};

export default CardWithHeader;
