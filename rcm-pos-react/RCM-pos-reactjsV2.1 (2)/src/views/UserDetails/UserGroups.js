import React, { useEffect, useState } from "react";
import { Card, Row, Col, Button, Popover, PopoverBody, Spinner } from "reactstrap";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "react-feather";
import { displayModes, statusColors } from "../../config/config";
import ToastMessage from "../../components/ToastMessage";
import UserGroupDropdown from "../components/UserGroupDropdown";

import {
  getUserGroup,
  createUserGroup,
  updateUserGroup,
  deleteUserGroup,
} from "../../helper/user-group";

const UserGroups = ({ userId, displayMode }) => {
  const [userGroupList, setUserGroupList] = useState([]);
  const [popoverOpen, setPopoverOpen] = useState([]);
  const [warningMsg, setWarningMsg] = useState("");

  /**
   * Handles popovers for "delete" action
   * @param {Number} key    Index of the array
   */
  const togglePopover = (key) => {
    setPopoverOpen((prevPopoverOpen) => {
      const updatedPopoverOpen = [];
      if (prevPopoverOpen[key]) {
        updatedPopoverOpen[key] = false;
      } else {
        updatedPopoverOpen[key] = true;
      }
      return updatedPopoverOpen;
    });
  };

  /**
   * Sets the selected GroupId to the appropriate rec.
   * @param {*} groupId
   * @param {*} index
   */
  const handleUserGroupChange = (groupId, index) => {
    console.log("userGroupList: ", JSON.stringify(userGroupList));
    console.log("groupId: ", groupId);

    //TODO: This duplicate check DOESN't Work. Need to FIX this
    //Check if the selected Group has already been added
    const existingGroup = userGroupList.findIndex((group) => group.groupId == groupId);
    console.log("existingGroup: ", existingGroup);
    if (existingGroup > -1) {
      setWarningMsg("Group already added. Select a different one!");
    } else {
      setUserGroupList((prevUserGroupList) => {
        return prevUserGroupList.map((group, key) => {
          if (key === index) {
            group.groupId = groupId;
            return group;
          }
          return group;
        });
      });
      setWarningMsg("");
    }
  };

  /** Adds a new record & set it back to the `state` */
  const handleAdd = () => {
    const newRec = { userId, groupId: "" };

    /**NOT Required
     * setUserGroupList(prevUserGroupList => {
     *   const updatedUserGroupList = prevUserGroupList.map(group => group);
     *   return updatedUserGroupList.push(newRec);
     * });
     **/

    //Spread syntax ensures the state array is replaced rather than mutated
    setUserGroupList([...userGroupList, newRec]);
  };

  /**
   * Deletes a rec. & updates the `state`
   * @param {Number} index
   * @param {Number} userGroupId PK of the User Group rec.
   * */
  const handleDelete = async (index, userGroupId) => {
    try {
      //Remove the rec. from db if there is valid PK
      if (userGroupId) {
        const response = await deleteUserGroup(userGroupId);
      }
      setUserGroupList((prevUserGroupList) => {
        //Ommit the deleted rec. & return the rest
        return prevUserGroupList.filter((group, key) => index !== key);
      });
    } catch (err) {
      setWarningMsg(err);
    }
  };

  const userGroupQuery = useQuery({
    queryKey: ["userGroups", userId],
    queryFn: async () => {
      if (userId) {
        const records = await getUserGroup({ userId });
        return records;
      } else {
        // throw new Error("Select a branch to continue");
        setWarningMsg("Unable to load records!");
        return [];
      }
    },
    // Setting this to `false` will disable this query from automatically running. But here after setting
    // it to false, `refetch()` isnt triggering this query either. So had to use !!userId, which
    // stops the query from executing automtically/initially & triggers it only when branch is changed

    //Enable the query only when a valid 'userId' is set
    enabled: !!userId, //double-negation is equivalent to -> userId ? true : false
    staleTime: 1000 * 60 * 10, //time in milliseconds after which the data is considered stale
    refetchOnWindowFocus: false,
  });

  //componentDidUpdate - set the query results to state
  useEffect(() => {
    if (userGroupQuery.status === "success") {
      setUserGroupList(userGroupQuery.data);
    }
  }, [userGroupQuery.data]);

  useEffect(() => {
    if (userGroupQuery.status === "error") {
      console.log("userGroupQuery.error: ", JSON.stringify(userGroupQuery.error));
      setWarningMsg(userGroupQuery.error.message);
    }
  }, [userGroupQuery.status]);

  return (
    <>
      <Row>
        <Col sm="4">
          <h6 className="heading-small text-muted mb-3">User Groups</h6>
        </Col>
        <Col sm="8">
          {" "}
          {/*className="text-right"*/}
          {
            displayMode === displayModes.EDIT &&
            /* NOTE: with `userGroupQuery.isLoading`, the spinner was alway spinning even before a Branch was
             * selected as the query `status` was always in `loading` until it bcomes `success` or `error`.
             * Replacing it with `isFetching` fixed the issue
             **/
            userGroupQuery.isFetching ? (
              <Spinner size="5" color="primary" className="reload-spinner" />
            ) : (
              // <Col className="text-left" md="2">
              <Button
                outline
                className="mb--1 ml--3"
                color="primary"
                // href="#"
                onClick={() => handleAdd()}
                size="sm"
              >
                Add
              </Button>
            )
            // </Col>
          }
        </Col>
      </Row>
      <Card className="pl-sm-4 pr-sm-4 pt-sm-1 pb-sm-0 mt--1 mb-3 shadow-xl">
        {" "}
        {/** text-center */}
        <Row className="mt-2 pb-3">
          {Array.isArray(userGroupList) && userGroupList.length ? (
            userGroupList.map((group, key) => {
              return (
                <>
                  <Col
                    className="text-left mr-0"
                    sm="4"
                    key={group.userGroupId ? group.userGroupId : group.userId + key}
                  >
                    {
                      //Show the Trash icon only when the list length is Greater than "1"
                      displayMode === displayModes.EDIT && userGroupList.length > 1 ? (
                        <>
                          <Popover
                            placement="top"
                            target={`group_${group.userId}_${key}`}
                            className="popover-warning"
                            isOpen={popoverOpen[key]}
                          >
                            <PopoverBody className="text-center">
                              <span className="text-gray-dark text-xs mb-2 font-weight-600">
                                Are you sure you want to delete?
                              </span>{" "}
                              <br />
                              <Button
                                outline
                                color="primary"
                                // href="#"
                                onClick={() => handleDelete(key, group.userGroupId)}
                                size="sm"
                              >
                                Yes
                              </Button>
                              <Button
                                outline
                                color="danger"
                                // href="#"
                                onClick={() => togglePopover(key)}
                                size="sm"
                              >
                                No
                              </Button>
                            </PopoverBody>
                          </Popover>
                          <Trash2
                            id={`group_${group.userId}_${key}`}
                            size={20}
                            className="mr-1 pb-1 text-danger"
                            onClick={() => togglePopover(key)}
                          />
                        </>
                      ) : null
                    }
                    <UserGroupDropdown
                      index={key}
                      groupId={group.groupId}
                      handleChange={handleUserGroupChange}
                      displayMode={displayMode}
                      // displayMode={checkUserPermission(moduleName, permissions.CREATE) ?
                      //   displayModes.EDIT : displayModes.VIEW}
                    />
                  </Col>
                </>
              );
            })
          ) : (
            <div className="mb-0">
              <i className="fa fa-info-circle text-blue" /> &nbsp;
              <small>
                Click <b>Add</b> to assign the user to <b>Groups</b>
              </small>
            </div>
          )}
        </Row>
      </Card>
      {warningMsg && <ToastMessage type={statusColors.WARNING} message={warningMsg} />}
    </>
  );
};

export default UserGroups;
