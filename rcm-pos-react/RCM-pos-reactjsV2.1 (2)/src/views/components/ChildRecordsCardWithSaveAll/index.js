import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
// reactstrap components
import { Card, CardBody, Row, Col, Button, Spinner, UncontrolledTooltip } from "reactstrap";
import { ChevronsRight, Trash2, Circle, Sun, Loader } from "react-feather";
import HeaderCardWithTransparentTitle from "../../../components/Headers/HeaderCardWithTransparentTitle";
import DeleteWithConfirmation from "../../../components/DeleteWithConfirmation";
import DisplayMessage from "../../../components/DisplayMessage";
import { displayModes, statusColors, recordStatuses } from "../../../config/config";

/**
 * 
 * @param {*} props `title, subTitle, recordType, emptyRecord, newRecord, resetNewRecord, 
    primaryKeyField, uniqueField, parentId, queryKey, getRecordHelper, createRecordHelper, updateRecordHelper,
    deleteRecordHelper, displayMode, recordsPerRow, setDisplayMode, setSuccessMsg, setWarningMsg, rightContent,
    RecordDetails`
 */
const ChildRecordsCardWithSaveAll = ({
  title,
  subTitle,
  recordType,
  emptyRecord,
  newRecord,
  resetNewRecord,
  primaryKeyField,
  uniqueField,
  parentId,
  queryKey,
  getRecordHelper,
  createRecordHelper,
  updateRecordHelper,
  deleteRecordHelper,
  displayMode,
  recordsPerRow,
  setDisplayMode,
  setSuccessMsg,
  setWarningMsg,
  rightContent,
  recordDetails: RecordDetails,
  additionalButtons: AdditionalButtons,
  recordLimit,
}) => {
  const queryClient = useQueryClient();
  const [recordList, setRecordList] = useState([]);
  // const [displayMode, setDisplayMode] = useState(displayModes.VIEW);
  const [popoverOpen, setPopoverOpen] = useState([]);
  const [invalidData, setInvalidData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [colSize, setColSize] = useState("4");

  const togglePopover = useCallback(
    (key) => {
      if (key > -1) {
        console.log("togglePopover: ", key);
        let updatedPopoverOpen = [];
        updatedPopoverOpen[key] = popoverOpen[key] ? false : true;
        console.log("togglePopover: ", updatedPopoverOpen);
        setPopoverOpen(updatedPopoverOpen);
      }
    },
    [popoverOpen],
  ); //re-create this method only whenever popoverOpen changes(WO this dep. popover `Close` didnt work)

  /**
   *
   * @param {*} index
   * @param {*} fieldName
   */
  const setInvalidMessage = (index, fieldName, message) => {
    const updatedInvalidData = [];
    updatedInvalidData[index] = { [fieldName]: message };
    setInvalidData(updatedInvalidData);
  };

  const isFormValid = () => {
    let isValid = true;
    for (let i = 0; i < recordList.length; i++) {
      if (!recordList[i][uniqueField]) {
        setInvalidMessage(i, uniqueField, `Enter a ${recordType} Name and save`);
        isValid = false;
        break;
      } else if (getDuplicateIndex(recordList, i) > -1) {
        setWarningMsg(recordType + " Name already exists!");
        setInvalidMessage(i, uniqueField, `${recordType} already exists!`);
        isValid = false;
        break;
      }
    }
    return isValid;
  };

  /**
   * Checks for Duplicate Name
   * @param {Object} recordList
   * @param {Number} key  Index of the current rec.
   * @returns
   */
  const getDuplicateIndex = (recordList, key) => {
    let duplicateIndex = -1;
    //Compare the currently updated rec. with existing recs.
    if (Array.isArray(recordList) && recordList.length > 0) {
      duplicateIndex = recordList.findIndex(
        (ele, index) => key !== index && ele[uniqueField] === recordList[key][uniqueField],
      );
    }
    console.log("duplicateIndex: ", duplicateIndex);
    return duplicateIndex;
  };

  /**
   * Sets the selected rec. info to state
   * @param {Object} event
   * @param {Number} index
   */
  const handleChange = (event, key) => {
    const { name, value } = event.target;
    const updatedList = recordList.map((rec, index) => {
      if (key === index) {
        if (recordList[index][primaryKeyField]) {
          return { ...rec, [name]: value, [recordStatuses.IS_UPDATED]: true }; //set the IS_UPDATED prop. only if the rec. already exists in the server
        } else {
          return { ...rec, [name]: value };
        }
      } else {
        return rec;
      }
    });
    // console.log("handleChange - updatedList: ", JSON.stringify(updatedList));
    setRecordList(updatedList);

    if (name === uniqueField) {
      //Check for the duplicates in the updated rec. list
      if (getDuplicateIndex(updatedList, key) > -1) {
        setInvalidMessage(key, uniqueField, `${recordType} already exists!`);
        // console.log("updatedInvalidData: ", JSON.stringify(updatedInvalidData));
      } else {
        setInvalidData([]);
      }
    }
  };

  //NOTE: enlosing this within `useCallback` & passing [] as dependency threw err. when performing delete
  const handleDelete = async (key) => {
    console.log("handleDelete - key: ", key);
    togglePopover(key);
    try {
      if (recordList[key] && recordList[key][primaryKeyField]) {
        //set the `isDeleted` prop to the deleted rec.
        const updatedList = recordList.map((rec, index) =>
          key === index ? { ...rec, [recordStatuses.IS_DELETED]: true } : rec,
        );
        setRecordList(updatedList);

        // setIsLoading(true);
        // const response = await deleteRecordHelper(recordList[key][primaryKeyField]);
        // if(response) {
        //   //Remove the rec. from the query
        //   queryClient.setQueryData([queryKey, parentId], (old) =>
        //     old.filter(rec => rec[primaryKeyField] !== recordList[key][primaryKeyField])
        //   );
        //   setRecordList(recordList[0]);
        //   // setDisplayMode(displayModes.VIEW);
        //   setSuccessMsg(recordType +" has been removed successfully!");
        // }
      } else {
        console.log("handleDelete2 - key: ", key);
        const updatedList = recordList.filter((rec, index) => index !== key);
        setRecordList(updatedList);
      }
    } catch (err) {
      setWarningMsg(JSON.stringify(err));
    }
  };

  const handleAdd = () => {
    console.log("emptyRecord: ", JSON.stringify(emptyRecord));
    console.log("newRecord: ", JSON.stringify(newRecord));
    //For `Store Counter`
    if (emptyRecord) {
      setRecordList([...recordList, emptyRecord]);
    }
    //For `Store User or Warehouse`
    else if (newRecord && Object.keys(newRecord).length > 0) {
      setRecordList([...recordList, newRecord]);
      resetNewRecord();
    } else {
      setWarningMsg(`Select a ${recordType} to add!`);
    }
  };

  const handleEdit = () => {
    setDisplayMode(displayModes.EDIT);
  };

  const handleCancel = () => {
    setRecordList(queryClient.getQueryData([queryKey, parentId]));
    setInvalidData([]);
    setDisplayMode(displayModes.VIEW);

    //Reset the newRecord in the parent comp.
    if (resetNewRecord) {
      resetNewRecord();
    }
  };

  const handleSave = async () => {
    // console.log("handleSave - recordList: ", JSON.stringify(recordList));
    if (isFormValid()) {
      setIsLoading(true);
      try {
        //CREATE
        // const newRecords = recordList.filter(rec => !rec[primaryKeyField]);

        //NOTE: .map returns `undefined` when the `if` cond. is not met
        // const newRecords = recordList.map(rec => {
        //   if(!rec[primaryKeyField]) {
        //     delete rec[recordStatuses.IS_UPDATED];
        //     return rec;
        //   }
        // });
        const newRecords = [];
        recordList.forEach((rec) => {
          if (!rec[primaryKeyField]) {
            delete rec[recordStatuses.IS_UPDATED];
            newRecords.push(rec);
          }
        });

        if (Array.isArray(newRecords) && newRecords.length > 0) {
          //Add the new recs. to the query
          const createdRecords = await createRecordHelper(newRecords, parentId);
          queryClient.setQueryData([queryKey, parentId], (old) => [...old, ...createdRecords]);
        }

        //UPDATE
        const updatedRecords = [];
        recordList.forEach((rec) => {
          if (rec[recordStatuses.IS_UPDATED]) {
            delete rec[recordStatuses.IS_UPDATED];
            updatedRecords.push(rec);
          }
        });
        if (Array.isArray(updatedRecords) && updatedRecords.length > 0) {
          const response = await updateRecordHelper(updatedRecords);

          if (response) {
            //Replace the old recs. in the query with the updated ones without `mutating` it
            const oldRecords = queryClient.getQueryData([queryKey, parentId]);
            const updatedList = oldRecords.map((old) => {
              //`find` returns the 1st matching element
              const updatedRec = updatedRecords.find(
                (updated) => old[primaryKeyField] === updated[primaryKeyField],
              );
              return updatedRec || old;
            });
            queryClient.setQueryData([queryKey, parentId], updatedList);
          }
        }

        //DELETE
        const deletedRecordIDs = [];
        recordList.forEach((rec) => {
          if (rec[recordStatuses.IS_DELETED]) {
            deletedRecordIDs.push(rec[primaryKeyField]);
          }
        });
        if (Array.isArray(deletedRecordIDs) && deletedRecordIDs.length > 0) {
          const response = await deleteRecordHelper(deletedRecordIDs);

          if (response) {
            //Remove the deleted recs. from the query without `mutating` it
            const oldRecords = queryClient.getQueryData([queryKey, parentId]);
            const updatedList = oldRecords.filter(
              (old) => !deletedRecordIDs.includes(old[primaryKeyField]),
              // const updatedRecord = deletedRecordIDs.find(deletedId => old[primaryKeyField] === deletedId);
              // return updatedRecord || old;
            );
            queryClient.setQueryData([queryKey, parentId], updatedList);
          }
        }
        setDisplayMode(displayModes.VIEW);
        setSuccessMsg(recordType + " has been saved successfully!");
        //Reset the newRecord in the parent comp.
        if (resetNewRecord) {
          resetNewRecord();
        }
      } catch (err) {
        console.log("handleSave: ", JSON.stringify(err));
        setWarningMsg(JSON.stringify(err));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const recordListQuery = useQuery({
    queryKey: [queryKey, parentId],
    queryFn: async () => {
      const records = await getRecordHelper(parentId); //await getRecords(branchId);
      return records;
    },
    // Setting this to `false` will disable this query from automatically running
    //Enable the query by default
    enabled: true,
    staleTime: 1000 * 60 * 60, //time in milliseconds after which the data is considered stale
    refetchOnWindowFocus: false,
  });

  //componentDidUpdate - set the query results to state
  useEffect(() => {
    if (recordListQuery.status === "success") {
      setRecordList(recordListQuery.data);
    }
  }, [recordListQuery.data]);

  useEffect(() => {
    if (recordListQuery.status === "error") {
      console.log("recordListQuery.error: ", JSON.stringify(recordListQuery.error));
      setWarningMsg(recordListQuery.error.message);
    }
  }, [recordListQuery.status]);

  useEffect(() => {
    setIsLoading(recordListQuery.isFetching);
  }, [recordListQuery.isFetching]);

  useEffect(() => {
    let size = "12";
    if (recordsPerRow === "4") size = "3";
    else if (recordsPerRow === "3") size = "4";
    else if (recordsPerRow === "2") size = "6";
    setColSize(size);
  }, [colSize]);

  return (
    <>
      <HeaderCardWithTransparentTitle
        title={title}
        subTitle={subTitle}
        displayMode={displayMode}
        isLoading={isLoading}
        rightContent={
          <Row className="text-right">
            {!isLoading && AdditionalButtons ? (
              <Col>
                <AdditionalButtons />
              </Col>
            ) : null}
            {isLoading ? (
              <Col>
                <Spinner color="primary" className="reload-spinner" />
              </Col>
            ) : displayMode === displayModes.EDIT ? (
              <>
                <Col md="6">{rightContent}</Col>
                <Col md="6">
                  <Button className="mb-2" color="primary" onClick={handleAdd} size="sm">
                    Add
                  </Button>
                  {Array.isArray(recordList) && recordList.length > 0 && (
                    <Button className="mb-2" color="success" onClick={handleSave} size="sm">
                      Save
                    </Button>
                  )}
                  <Button className="mb-2" color="danger" onClick={handleCancel} size="sm">
                    {" "}
                    {/* outline */}
                    Cancel
                  </Button>
                </Col>
              </>
            ) : displayMode === displayModes.VIEW ? (
              <>
                <Col>
                  <Button className="mb-2" color="primary" onClick={handleEdit} size="sm">
                    Edit
                  </Button>
                </Col>
              </>
            ) : null}
          </Row>
        }
      />
      <Card className="bg-white shadow">
        <CardBody className="mt--2 mb--3">
          {" "}
          {/** shadow */}
          <Row className="mt-2 pb-2">
            {recordListQuery.isFetching ? (
              <DisplayMessage type={statusColors.INFO} iconSize={"xs"} message={`Loading...`} />
            ) : Array.isArray(recordList) && recordList.length > 0 ? (
              recordList.map((record, key) => {
                // <Rows key={record[primaryKeyField]} record={record} index={key} /> )
                /* Del. popover shows up at the right top corner of the page when <Rows> comp. is used */
                if (!record[recordStatuses.IS_DELETED]) {
                  return (
                    <Col
                      className="text-left mb-3"
                      md={colSize}
                      sm="6"
                      key={record[primaryKeyField] ? `rec-${record[primaryKeyField]}-${key}` : key}
                    >
                      {displayMode === displayModes.EDIT ? (
                        <DeleteWithConfirmation
                          index={key} //this comp. didnt work when using `key` as a prop name (as it is a reserved keyword)
                          targetId={
                            record[primaryKeyField]
                              ? `${recordType}_${record[primaryKeyField]}_${key}`
                              : `${recordType}_trash_${key}`
                          }
                          popoverOpen={popoverOpen[key]}
                          popoverPlacement="top"
                          iconSize={20}
                          handleDelete={handleDelete}
                          togglePopover={togglePopover}
                        />
                      ) : null}
                      <>
                        <RecordDetails
                          index={key}
                          record={record}
                          displayMode={displayMode}
                          invalidData={invalidData[key]}
                          handleChange={handleChange}
                        />
                      </>
                    </Col>
                  );
                }
              })
            ) : !recordList.length ? (
              <Col>
                <DisplayMessage
                  type={statusColors.INFO}
                  iconSize={"xs"}
                  message={`No ${recordType} is curently added.`}
                />
              </Col>
            ) : null}
          </Row>
        </CardBody>
      </Card>
    </>
  );
};

export default ChildRecordsCardWithSaveAll;
