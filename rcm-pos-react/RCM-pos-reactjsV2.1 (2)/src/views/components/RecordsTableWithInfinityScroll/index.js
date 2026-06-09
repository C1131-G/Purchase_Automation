import React, { useState, useEffect, useRef, useCallback } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { Card, Table, Spinner } from "reactstrap";
import DisplayMessage from "../../../components/DisplayMessage.js";
import { displayModes, statusColors } from "../../../config/config.js";

const RecordsTableWithInfinityScroll = ({
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
  const { ref, inView } = useInView();

  const [recordList, setRecordList] = useState([]);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const queryKeysList = [queryKey, filters];

  // Fetch data
  const { data, fetchNextPage, hasNextPage, isFetching, isError, error } = useInfiniteQuery({
    queryKey: queryKeysList,
    queryFn: async ({ pageParam = 1 }) => {
      const adjustedFilters = { ...filters };

      // Set time boundaries based on whether it's fromDate or toDate
      if (filters?.fromDate) {
        // Set to start of day: 00:00:00.000
        adjustedFilters.fromDate = new Date(filters.fromDate);
        //adjustedFilters.fromDate.setHours(0, 0, 0, 0);
      }
      if (filters?.toDate) {
        // Set to end of day: 23:59:59.999
        adjustedFilters.toDate = new Date(filters.toDate);
        //adjustedFilters.toDate.setHours(23, 59, 59, 999);
      }

      const records = await getRecordHelper({ ...adjustedFilters, pageNum: pageParam });
      return records;
    },
    getNextPageParam: (lastPage, pages) => {
      // console.log("lastPage: ", lastPage);
      // console.log("pages: ", pages);

      if (lastPage?.hasNextPage) {
        return pages.length + 1; // Increment page number
      } else {
        return undefined; // No more pages
      }
    },
    enabled: true,
    staleTime: 1000 * 60 * 60, //time in milliseconds after which the data is considered stale
    refetchOnWindowFocus: false,
  });

  // Handle data updates
  useEffect(() => {
    // When the api returns an empty array, `flapMap` returns an array with
    // `undefined` as the 1st ele., [undefined] which was causing issue when rendering <Table>.
    // Added below cond. to set an empty array to `recordList` in such cases.
    // console.log("useInfiniteQuery - data: ", data);
    if (data && data.pages && data.pages[0]) {
      const allRecords = data.pages.flatMap((page) => page);
      // console.log("useInfiniteQuery - allRecords: ", allRecords);
      setRecordList(allRecords);
      setRecordCount(allRecords.length);
    } else {
      setRecordList([]);
      setRecordCount(0);
    }
  }, [data]);

  // Handle errors
  useEffect(() => {
    if (isError) {
      setWarningMsg(error.message);
    }
  }, [isError, error]); //setWarningMsg

  // Invalidate query on reload
  useEffect(() => {
    if (reloadData) {
      queryClient.invalidateQueries(queryKeysList);
    }
  }, [reloadData, queryClient, queryKeysList]);

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [fetchNextPage, inView]);

  // Infinite scroll handler
  // const observer = useRef();
  // const lastRecordElementRef = useCallback(
  //   (node) => {
  //     if (isFetchingNextPage) return;
  //     if (observer.current) observer.current.disconnect();
  //     observer.current = new IntersectionObserver((entries) => {
  //       if (entries[0].isIntersecting && hasNextPage) {
  //         setIsFetchingNextPage(true);
  //         fetchNextPage().then(() => setIsFetchingNextPage(false));
  //       }
  //     });
  //     if (node) observer.current.observe(node);
  //   },
  //   [isFetchingNextPage, fetchNextPage, hasNextPage]
  // );

  // console.log("recordList: ", recordList);

  return (
    <Card className="shadow">
      {" "}
      {/** table-fixed-head table-fixed-head-lg */}
      <Table size="sm" className="align-items-center table-flush" responsive>
        {isFetching ? ( //&& isFetchingNextPage
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
                  if (recordList.length === key + 1) {
                    return <TableContent key={key} record={record} index={key} ref={ref} />;
                  } else {
                    return <TableContent key={key} record={record} index={key} />;
                  }
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
      {isFetchingNextPage && <Spinner size="sm" />}
    </Card>
  );
};

export default RecordsTableWithInfinityScroll;
