import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
// reactstrap components
import { Card, Row, Col, CardHeader, CardBody, Spinner } from "reactstrap";
import DisplayMessage from "../../components/DisplayMessage";
import { displayModes, statusColors } from "../../config/config";

/**
 * USAGE: This component must be placed outside the `<Card>` component
 * @param {*} props `title, rightContent`
 */
const HeaderCardWithTransparentTitle = ({ title, rightContent, subTitle }) => {
  return (
    <Row className="align-items-center mt-0 mb-2">
      <Col md="6">
        <h6 className="heading-small text-muted mb-0">{title}</h6>
        {subTitle && (
          <DisplayMessage type={statusColors.PRIMARY} message={subTitle} iconSize={"sm"} />
        )}{" "}
        {/** fontColor="darkgray" */}
      </Col>
      <Col className="text-right" md="6">
        {rightContent}
      </Col>
    </Row>
  );
};

export default HeaderCardWithTransparentTitle;
