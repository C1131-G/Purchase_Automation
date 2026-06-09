import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
// reactstrap components
import { Card, Row, Col, Button, Spinner } from "reactstrap";
import { displayModes } from "../../config/config";

const CardSmall = ({ title, displayMode, isLoading, rightContent, children }) => {
  return (
    <>
      <Row>
        <h6 className="heading-small text-muted mb-3">{title}</h6>
        <div className="mr-2 d-flex justify-content-between ml-auto">
          {/* {displayMode === displayModes.EDIT && */}
          <>
            {isLoading ? (
              <Spinner color="primary" className="reload-spinner" />
            ) : rightContent ? (
              rightContent
            ) : null}
          </>
          {/* } */}
        </div>
      </Row>
      <Card className="pl-sm-4 pr-sm-4 pt-sm-1 pb-sm-0 mt--1 mb-3 shadow-xl">
        {" "}
        {/** text-center */}
        <Row className="mt-2 pb-2">{children}</Row>
      </Card>
    </>
  );
};

export default CardSmall;
