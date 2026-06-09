import React, { useState, useEffect, useRef, useCallback } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Table, Spinner } from "reactstrap";
import DisplayMessage from "../../../components/DisplayMessage.js";
import { displayModes, statusColors } from "../../../config/config.js";

const RecordsTableWithFilter = ({
  recordType,
  queryKey,
  headerColumns,
  reloadData,
  getRecordHelper,
  setRecordCount,
  filters,
  displayMode,
  setDisplayMode,
  setSuccessMsg,
  setWarningMsg,
  tableContent: TableContent,
}) => {
  const queryClient = useQueryClient();
  const [recordList, setRecordList] = useState([]);

  const queryKeysList = [queryKey, filters];
  const recordListQuery = useQuery({
    queryKey: queryKeysList,
    queryFn: async () => {
      const records = await getRecordHelper(filters);
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
  }, [recordListQuery.data]);

  useEffect(() => {
    if (recordListQuery.status === "error") {
      // console.log("recordListQuery.error: ", JSON.stringify(recordListQuery.error));
      setWarningMsg(recordListQuery?.error?.message);
    }
  }, [recordListQuery.status]);

  //Invalidate Query when `Refresh` button is clicked
  useEffect(() => {
    if (reloadData) {
      // || filters
      queryClient.invalidateQueries({ queryKey: queryKeysList });
    }
  }, [reloadData]); //, filters

  // Triggers an API call for already fetched data too
  // useEffect(() => {
  //   // console.log("filter - useEffect: ", filter);
  //   if(filters) {
  //     recordListQuery.refetch();
  //   }
  // }, [filters]);

  return (
    <Card className="shadow">
      {" "}
      {/** table-fixed-head table-fixed-head-lg */}
      <Table size="sm" className="align-items-center table-flush" responsive>
        {recordListQuery.isFetching ? ( //&& isFetchingNextPage
          <DisplayMessage type={statusColors.INFO} iconSize={"xs"} message={`Loading...`} />
        ) : (
          <>
            <thead className="thead-light">
              <tr>
                {headerColumns.map((headerCol) => (
                  <th scope="col" key={headerCol.label}>
                    {headerCol.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.isArray(recordList) && recordList.length > 0 ? (
                recordList.map((record, key) => {
                  return <TableContent key={key} record={record} index={key} />;
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

export default RecordsTableWithFilter;
