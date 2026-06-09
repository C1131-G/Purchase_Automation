import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
// reactstrap components
import { Card, CardBody, Row, Col, Button, Spinner, UncontrolledTooltip } from "reactstrap";
import { ChevronsRight, Trash2, Circle, Sun, Loader } from "react-feather";
import HeaderCardWithSubtitle from "../../../components/Headers/HeaderCardWithSubtitle";
import DeleteWithConfirmation from "../../../components/DeleteWithConfirmation";
import DisplayMessage from "../../../components/DisplayMessage";
import { displayModes, statusColors } from "../../../config/config";

/**
 * 
 * @param {*} props `title, subTitle, recordType, primaryKeyField, parentId, newRecord, setRecord,
    queryKey, getRecordHelper, createRecordHelper, deleteRecordHelper,
    displayMode, recordsPerRow, validateForm, setSuccessMsg, setWarningMsg, rightContent,
    recordDetails: RecordDetails`
 */
const ChildRecordsCard = ({
  title,
  subTitle,
  recordType,
  primaryKeyField,
  parentId,
  newRecord,
  setRecord,
  queryKey,
  getRecordHelper,
  createRecordHelper,
  deleteRecordHelper,
  displayMode,
  recordsPerRow,
  validateForm,
  setSuccessMsg,
  setWarningMsg,
  rightContent,
  recordDetails: RecordDetails,
}) => {
  const queryClient = useQueryClient();
  const [recordList, setRecordList] = useState([]);
  // const [displayMode, setDisplayMode] = useState(displayModes.EDIT);
  const [popoverOpen, setPopoverOpen] = useState([]);
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

  //NOTE: enlosing this within `useCallback` & passing [] as dependency threw err. when performing delete
  const handleDelete = async (key) => {
    togglePopover(key);
    try {
      if (recordList[key][primaryKeyField]) {
        setIsLoading(true);
        const response = await deleteRecordHelper(recordList[key][primaryKeyField]);
        if (response) {
          //Remove the rec. from the query
          queryClient.setQueryData([queryKey, parentId], (old) =>
            old.filter((rec) => rec[primaryKeyField] !== recordList[key][primaryKeyField]),
          );
          setRecordList(recordList[0]);
          // setDisplayMode(displayModes.VIEW);
          setSuccessMsg(recordType + " has been removed successfully!");
        }
      } else {
        const updatedRecordList = recordList.filter((rec, index) => index !== key);
        setRecordList(updatedRecordList);
      }
    } catch (err) {
      setWarningMsg(JSON.stringify(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRecord = useCallback(async () => {
    if (validateForm()) {
      setIsLoading(true);
      try {
        //Add the new rec. to the query & set it as `selected`
        const newRec = await createRecordHelper(newRecord, parentId);
        queryClient.setQueryData([queryKey, parentId], (old) => [...old, newRec]);
        setSuccessMsg(recordType + " has been added successfully!");
        setRecord({});
      } catch (err) {
        console.log("handleSave: ", JSON.stringify(err));
        setWarningMsg(JSON.stringify(err));
      } finally {
        setIsLoading(false);
      }
    }
  }, [newRecord]); //WO this dep. this funct. doesnt pick the values in the `newRecord`

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
    const size = recordsPerRow == "4" ? "3" : "3" ? "4" : "4";
    setColSize(size);
  }, [colSize]);

  return (
    <Card className="bg-white shadow">
      <HeaderCardWithSubtitle
        title={title}
        subTitle={subTitle}
        displayMode={displayMode}
        isLoading={isLoading}
        rightContent={
          displayMode === displayModes.EDIT && (
            <Row>
              <Col md="10">{rightContent}</Col>
              {!isLoading ? (
                <Col md="2">
                  <Button
                    // outline
                    className="mb-2"
                    color="primary"
                    onClick={handleAddRecord}
                    size="sm"
                  >
                    Add
                  </Button>
                </Col>
              ) : (
                <Spinner color="primary" className="reload-spinner" />
              )}
            </Row>
          )
        }
      />
      <CardBody className="mt--2 mb--3">
        {" "}
        {/** shadow */}
        <Row className="mt-2 pb-2">
          {recordListQuery.isFetching ? (
            <DisplayMessage type={statusColors.INFO} iconSize={"xs"} message={`Loading...`} />
          ) : Array.isArray(recordList) && recordList.length > 0 ? (
            recordList.map((record, key) => {
              return (
                <Col
                  className="text-left mb-3"
                  md={colSize}
                  sm="6"
                  /** NOTE: 'record[primaryKeyField]' will be NULL duing CREATE op.,
                   * this causes, unpredictable screen behaviour when user attempts to add
                   * more than 1 'record'. Bcoz, now more than List has NULL value as
                   * their 'key', so this causes the issue.
                   * So added 'key' as the comp.'s 'key' as a 'hack', though it is not recommended
                   */
                  key={record[primaryKeyField] ? record[primaryKeyField] : key}
                >
                  {displayMode === displayModes.EDIT ? (
                    <DeleteWithConfirmation
                      index={key} //this comp. didnt work when using `key` as a prop name (as it is a reserved keyword)
                      targetId={`${recordType}_${record[primaryKeyField]}_${key}`}
                      popoverOpen={popoverOpen[key]}
                      popoverPlacement="top"
                      iconSize={20}
                      handleDelete={handleDelete}
                      togglePopover={togglePopover}
                    />
                  ) : null}
                  <>
                    <RecordDetails record={record} />

                    {/* <i id={"toolTip"+key}
                    className="fa fa-question-circle text-info pt-2 pl-2 mr-1 cursor-pointer text-sm"
                  />
                  <UncontrolledTooltip
                    delay={0}
                    placement="top"
                    target={"toolTip"+key}
                  >
                    <span className="font-italic">{recordType} Code:</span> <br/>
                    {record.warehouseCode}
                  </UncontrolledTooltip> */}
                  </>
                </Col>
              );
            })
          ) : (
            <Col>
              <DisplayMessage
                type={statusColors.INFO}
                iconSize={"xs"}
                message={`No ${recordType} is curently added.`}
              />
            </Col>
          )}
        </Row>
      </CardBody>
    </Card>
  );
};

export default ChildRecordsCard;
