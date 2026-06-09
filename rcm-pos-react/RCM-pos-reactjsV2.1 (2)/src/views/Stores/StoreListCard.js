import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import RecordListCard from "../../components/RecordListCard";
import { getStore, deleteStore } from "../../helper/store";
import { displayModes } from "../../config/config";

//displayMode, operation, store, selectedStoreIndex, queryKey, setStore,
// setSelectedStoreIndex, setStoreList, setSuccessMsg, setWarningMsg
const StoreListCard = (props) => {
  const recordType = "Store";
  const labelField = "storeName";
  const primaryKeyField = "storeId";

  const queryClient = useQueryClient();
  const [recordList, setRecordList] = useState([]);

  const handleClick = (store, index) => {
    props.setStore(store);
    props.setSelectedStoreIndex(index);
  };

  const handleDelete = async () => {
    props.setIsLoading(true);
    try {
      const response = await deleteStore(props.store[primaryKeyField]);
      if (response) {
        //Remove the rec. from the query
        queryClient.setQueryData([props.queryKey], (oldStores) =>
          oldStores.filter((store) => store[primaryKeyField] !== props.store[primaryKeyField]),
        );
        props.setStore(recordList[0]);
        props.setSelectedStoreIndex(0);
        props.setDisplayMode(displayModes.VIEW);
        props.setSuccessMsg(recordType + " deleted successfully!");
      }
    } catch (err) {
      props.setWarningMsg(JSON.stringify(err));
    } finally {
      props.setIsLoading(false);
    }
  };

  const recordListQuery = useQuery({
    queryKey: [props.queryKey],
    queryFn: async () => {
      const records = await getStore(); //await getRecords(branchId);
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
      props.setStoreList(recordListQuery.data);
    }
  }, [recordListQuery.data]);

  useEffect(() => {
    if (recordListQuery.status === "error") {
      console.log("recordListQuery.error: ", JSON.stringify(recordListQuery.error));
      props.setWarningMsg(recordListQuery.error.message);
    }
  }, [recordListQuery.status]);

  return (
    <>
      <RecordListCard
        title={recordType + "s"}
        isLoading={recordListQuery.isFetching}
        displayMode={props.displayMode}
        operation={props.operation}
        selectedRecord={props.store}
        selectedRecordIndex={props.selectedStoreIndex}
        recordList={recordList}
        primaryKeyField={primaryKeyField}
        labelField={labelField}
        maxHeight={"500px"}
        handleClick={handleClick}
        handleDelete={handleDelete}
      />
    </>
  );
};

export default StoreListCard;
