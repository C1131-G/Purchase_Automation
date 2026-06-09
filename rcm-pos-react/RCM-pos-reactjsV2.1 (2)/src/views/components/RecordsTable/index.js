import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
// reactstrap components
import { Card, Table, CardBody, Row, Col, Button, Spinner, UncontrolledTooltip } from "reactstrap";
import DeleteWithConfirmation from "../../../components/DeleteWithConfirmation";
import DisplayMessage from "../../../components/DisplayMessage";
import { displayModes, statusColors } from "../../../config/config";

/**
 * 
 * @param {*} props `recordType, emptyRecord, newRecord, resetNewRecord, enableDelete,
    primaryKeyField, uniqueField, parentId, queryKey, headerColumns, reloadData,
    getRecordHelper, createRecordHelper, updateRecordHelper,
    deleteRecordHelper, displayMode, setDisplayMode, setSuccessMsg, setWarningMsg,
    tableContent`
 */
const RecordsTable = ({
  recordType,
  emptyRecord,
  newRecord,
  resetNewRecord,
  enableDelete,
  primaryKeyField,
  uniqueField,
  parentId,
  queryKey,
  headerColumns,
  reloadData,
  getRecordHelper,
  createRecordHelper,
  updateRecordHelper,
  deleteRecordHelper,
  displayMode,
  setDisplayMode,
  setSuccessMsg,
  setWarningMsg,
  setRecordCount = undefined,
  tableContent: TableContent,
}) => {
  const queryClient = useQueryClient();
  const [recordList, setRecordList] = useState([]);
  // const [displayMode, setDisplayMode] = useState(displayModes.VIEW);
  const [popoverOpen, setPopoverOpen] = useState([]);
  const [invalidData, setInvalidData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sort, setSort] = useState({ column: null, direction: "desc" });

  const IS_DELETED = "isDeleted";
  const IS_UPDATED = "isUpdated";

  const queryKeysList = parentId ? [queryKey, parentId] : [queryKey];

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

  const getSortArrowClass = (column) => {
    let className = "sort-direction";
    if (sort.column === column) {
      className += sort.direction === "asc" ? " asc" : " desc";
    }
    return className;
  };

  const handleSort = () => {};

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
        // setWarningMsg(recordType +" Name already exists!");
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
          return { ...rec, [name]: value, [IS_UPDATED]: true }; //set the IS_UPDATED prop. only if the rec. already exists in the server
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
          key === index ? { ...rec, [IS_DELETED]: true } : rec,
        );
        setRecordList(updatedList);
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
    setRecordList(queryClient.getQueryData(queryKeysList));
    setInvalidData([]);
    setDisplayMode(displayModes.VIEW);

    //Reset the newRecord in the parent comp.
    if (resetNewRecord) {
      resetNewRecord();
    }
  };

  const handleSave = async () => {
    console.log("handleSave - recordList: ", JSON.stringify(recordList));
    if (isFormValid()) {
      setIsLoading(true);
      try {
        //CREATE
        // const newRecords = recordList.filter(rec => !rec[primaryKeyField]);

        //NOTE: .map returns `undefined` when the `if` cond. is not met
        // const newRecords = recordList.map(rec => {
        //   if(!rec[primaryKeyField]) {
        //     delete rec[IS_UPDATED];
        //     return rec;
        //   }
        // });
        const newRecords = [];
        recordList.forEach((rec) => {
          if (!rec[primaryKeyField]) {
            delete rec[IS_UPDATED];
            newRecords.push(rec);
          }
        });

        if (Array.isArray(newRecords) && newRecords.length > 0) {
          //Add the new recs. to the query
          const createdRecords = await createRecordHelper(newRecords, parentId);
          queryClient.setQueryData(queryKeysList, (old) => [...old, ...createdRecords]);
        }

        //UPDATE
        const updatedRecords = [];
        recordList.forEach((rec) => {
          if (rec[IS_UPDATED]) {
            delete rec[IS_UPDATED];
            updatedRecords.push(rec);
          }
        });
        if (Array.isArray(updatedRecords) && updatedRecords.length > 0) {
          const response = await updateRecordHelper(updatedRecords);

          if (response) {
            //Replace the old recs. in the query with the updated ones without `mutating` it
            const oldRecords = queryClient.getQueryData(queryKeysList);
            const updatedList = oldRecords.map((old) => {
              //`find` returns the 1st matching element
              const updatedRec = updatedRecords.find(
                (updated) => old[primaryKeyField] === updated[primaryKeyField],
              );
              return updatedRec || old;
            });
            queryClient.setQueryData(queryKeysList, updatedList);
          }
        }

        //DELETE
        const deletedRecordIDs = [];
        recordList.forEach((rec) => {
          if (rec[IS_DELETED]) {
            deletedRecordIDs.push(rec[primaryKeyField]);
          }
        });
        if (Array.isArray(deletedRecordIDs) && deletedRecordIDs.length > 0) {
          const response = await deleteRecordHelper(deletedRecordIDs);

          if (response) {
            //Remove the deleted recs. from the query without `mutating` it
            const oldRecords = queryClient.getQueryData(queryKeysList);
            const updatedList = oldRecords.filter(
              (old) => !deletedRecordIDs.includes(old[primaryKeyField]),
              // const updatedRecord = deletedRecordIDs.find(deletedId => old[primaryKeyField] === deletedId);
              // return updatedRecord || old;
            );
            queryClient.setQueryData(queryKeysList, updatedList);
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
    queryKey: queryKeysList,
    queryFn: async () => {
      const records = await getRecordHelper(parentId);
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
      if (recordListQuery?.data) {
        setRecordList(recordListQuery.data);
        if (setRecordCount) {
          setRecordCount(recordListQuery.data.length);
        }
      } else {
        setRecordList([]);
        setRecordCount(0);
      }
    }
  }, [recordListQuery?.data]);

  useEffect(() => {
    if (recordListQuery.status === "error") {
      console.log("recordListQuery.error: ", JSON.stringify(recordListQuery.error));
      setWarningMsg(recordListQuery.error.message);
    }
  }, [recordListQuery.status]);

  useEffect(() => {
    setIsLoading(recordListQuery.isFetching);
  }, [recordListQuery.isFetching]);

  //Invalidate Query when `Refresh` button is clicked
  useEffect(() => {
    if (reloadData) {
      queryClient.invalidateQueries({ queryKey: queryKeysList });
    }
  }, [reloadData]);

  return (
    <Card className="table-fixed-head table-fixed-head-lg">
      <Table size="sm" className="align-items-center table-flush" responsive>
        {isLoading ? (
          <DisplayMessage type={statusColors.INFO} iconSize={"xs"} message={`Loading...`} />
        ) : (
          <>
            <thead className="thead-light">
              <tr>
                {headerColumns.map((headerCol) => {
                  return headerCol.sortField ? (
                    <th
                      scope="col"
                      key={headerCol.label}
                      onClick={() => handleSort(headerCol.sortField)}
                      className="cursor-pointer"
                    >
                      {headerCol.label}
                      <span className={() => getSortArrowClass(headerCol.sortField)} />
                    </th>
                  ) : (
                    <th scope="col" key={headerCol.label}>
                      {headerCol.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Array.isArray(recordList) && recordList.length > 0 ? (
                recordList.map((record, key) => {
                  return (
                    <>
                      {displayMode === displayModes.EDIT && enableDelete ? (
                        <DeleteWithConfirmation
                          index={key}
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
                      <TableContent record={record} index={key} />
                    </>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={headerColumns.length}>
                    <DisplayMessage
                      type={statusColors.INFO}
                      iconSize={"xs"}
                      message={`No records found!`}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </>
        )}
      </Table>
    </Card>
  );
};

export default RecordsTable;
