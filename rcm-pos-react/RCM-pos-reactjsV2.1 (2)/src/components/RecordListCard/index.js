import React, { useState, useEffect } from "react";
import classnames from "classnames";
// reactstrap components
import {
  Card,
  Col,
  Row,
  Button,
  FormGroup,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  Spinner,
  Nav,
  NavItem,
  NavLink,
  Popover,
  PopoverBody,
} from "reactstrap";
import { ChevronsRight, Trash2 } from "react-feather";
import DeleteWithConfirmation from "../../components/DeleteWithConfirmation";
import { displayModes } from "../../config/config";

//title, displayMode, operation, recordList, primaryKeyField, labelField, maxHeight
const RecordListCard = ({ selectedRecordIndex = 0, ...props }) => {
  const [activeKey, setActiveKey] = useState(-1);
  const [activeRecord, setActiveRecord] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const togglePopover = () => {
    setPopoverOpen((prevPopoverOpen) => !prevPopoverOpen);
  };

  const handleRecordClick = (record, key) => {
    props.handleClick(record, key);
  };

  const handleDelete = () => {
    togglePopover();
    props.handleDelete();
  };

  const handleSearch = (searchKey) => {};

  //Auto-select the 1st record on page load
  useEffect(() => {
    if (Array.isArray(props.recordList) && props.recordList.length > 0) {
      handleRecordClick(props.recordList[selectedRecordIndex], selectedRecordIndex);
    }
  }, [props.recordList]);

  //Reset the prev. selcted rec. to the state when 'Cancel' button is pressed
  useEffect(() => {
    if (
      props.operation === displayModes.VIEW &&
      Array.isArray(props.recordList) &&
      props.recordList.length > 0
    ) {
      handleRecordClick(props.recordList[selectedRecordIndex], selectedRecordIndex);
    }
  }, [props.operation]);

  return (
    <>
      <Row className="ml-2">
        <h6 className="heading-small text-muted mb-3">{props.title}</h6>
        {props.showSearch ? (
          <Col md="9" className="ml-3 mb--3">
            <FormGroup
              className={classnames({
                focused: searchFocused,
              })}
            >
              <InputGroup className="input-group" size="sm">
                {/** input-group-alternative */}
                <Input
                  placeholder="Search"
                  type="text"
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  onKeyUp={(e) => handleSearch(e.target.value)}
                />
                <InputGroupAddon addonType="append">
                  <InputGroupText>
                    <i className="ni ni-zoom-split-in" />
                  </InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </FormGroup>
          </Col>
        ) : null}
      </Row>
      <Card
        style={{ maxHeight: props.maxHeight, overflow: "auto" }} //"450px"
        className="pl-sm-4 pr-sm-4 pt-sm-1 pb-sm-2 mt--1 mb-3 shadow-xl"
      >
        {" "}
        {/** text-center */}
        <Row className="mt-2">
          <Nav vertical>
            {props.isLoading ? (
              <small className="text-primary">Loading...</small>
            ) : Array.isArray(props.recordList) && props.recordList.length > 0 ? (
              props.recordList.map((record, key) => {
                return (
                  <NavItem
                    key={record[props.primaryKeyField] ? record[props.primaryKeyField] : key}
                  >
                    <NavLink
                      // href="#"
                      style={{
                        cursor: props.operation === displayModes.CREATE ? "default" : "pointer",
                      }}
                      disabled={props.operation === displayModes.CREATE ? true : false}
                      active={
                        props.displayMode !== displayModes.CREATE &&
                        props.selectedRecord[props.primaryKeyField] == record[props.primaryKeyField]
                          ? true
                          : false
                      }
                      className="py-2 text-md"
                    >
                      {props.selectedRecord[props.primaryKeyField] ==
                        record[props.primaryKeyField] && props.displayMode === displayModes.EDIT ? (
                        // && checkUserPermission(moduleName, permissions.CANCEL) ?
                        <DeleteWithConfirmation
                          targetId={`${props.title}_${record[props.primaryKeyField]}_${key}`}
                          popoverOpen={popoverOpen}
                          popoverPlacement="top"
                          iconSize={20}
                          handleDelete={handleDelete}
                          togglePopover={togglePopover}
                        />
                      ) : (
                        <ChevronsRight
                          size={20}
                          className={classnames(
                            "mr-1 pb-1",
                            props.selectedRecord[props.primaryKeyField] ==
                              record[props.primaryKeyField]
                              ? "text-primary"
                              : "",
                          )}
                        />
                      )}
                      {/*<i className="ni ni-user-run mr-2" />*/}
                      <span
                        onClick={() => handleRecordClick(record, key)}
                        className={classnames(
                          "mb-1 text-sm font-weight-600",
                          props.selectedRecord[props.primaryKeyField] ==
                            record[props.primaryKeyField]
                            ? "text-primary"
                            : "",
                        )}
                      >
                        {record[props.labelField]}
                      </span>
                    </NavLink>
                  </NavItem>
                );
              })
            ) : (
              props.displayMode === displayModes.VIEW && (
                <small className="text-primary">
                  <i className="fa fa-info-circle" /> &nbsp; No records found!
                  <br />
                  <br />
                  Click on <b>Create</b> to add a new one
                </small>
              )
            )}
          </Nav>
        </Row>
      </Card>
    </>
  );
};

export default RecordListCard;
