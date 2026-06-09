import React, { useState } from "react";
import { Button, Container, Row, Col, Card, CardHeader, CardBody, Spinner } from "reactstrap";
import DisplayMessage from "../DisplayMessage";
import { displayModes, statusColors } from "../../config/config";

//title, subTitle, isLoading, isRecordsAvailable, handleCreate, handleCopy, handleEdit
const PageContainer = (props) => {
  // const [displayMode, setDisplayMode] = useState(displayModes.VIEW);

  return (
    <>
      <Container className="mt-3" fluid>
        <Row>
          <Col className="order-xl-1" xl="12">
            <Card className="bg-white shadow">
              <CardHeader className="border-bottom">
                <Row className="align-items-center">
                  {" "}
                  {/** border-bottom */}
                  <Col md="6">
                    <h3 className="mb-1.5">{props.title}</h3>
                    {/**  className="mb-2" */}
                    <DisplayMessage
                      type={statusColors.INFO}
                      message={props.subTitle}
                      fontColor="darkgray"
                    />
                  </Col>
                  <Col className="text-right" md="5">
                    {props.isLoading ? (
                      <Spinner color="primary" className="reload-spinner" />
                    ) : props.displayMode === displayModes.VIEW ? (
                      <>
                        {props.isRecordsAvailable && props.handleCopy && (
                          <Button
                            color="primary"
                            // href="#"
                            //NOTE: this creates prob. when using HashRouter.
                            //Clicking on this logs out the user
                            onClick={props.handleCopy}
                            size="sm"
                          >
                            Copy
                          </Button>
                        )}
                        {props.handleCreate && (
                          <Button color="primary" onClick={props.handleCreate} size="sm">
                            Create
                          </Button>
                        )}
                        {props.handleEdit && props.isRecordsAvailable && (
                          <Button color="primary" onClick={props.handleEdit} size="sm">
                            Edit
                          </Button>
                        )}
                        {props.handleRefresh && (
                          <Button color="primary" onClick={props.handleRefresh} size="sm">
                            Refresh
                          </Button>
                        )}
                      </>
                    ) : props.displayMode === displayModes.EDIT &&
                      props.handleSave &&
                      props.handleCancel ? (
                      <>
                        <Button color="primary" onClick={props.handleSave} size="sm">
                          Save
                        </Button>
                        <Button color="danger" onClick={props.handleCancel} size="sm">
                          Cancel
                        </Button>
                      </>
                    ) : null}
                  </Col>
                  <Col className="text-right mt-2 pt-2" md="1">
                    {/* <FavouriteButton /> */}
                  </Col>
                </Row>
              </CardHeader>
              <CardBody className="mt--2 mb--3">
                {" "}
                {/** shadow */}
                {props.children}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default PageContainer;
