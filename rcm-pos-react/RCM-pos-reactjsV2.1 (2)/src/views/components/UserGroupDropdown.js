import React, { useEffect, useState } from "react";
import { Input } from "reactstrap";
import { useQuery } from "@tanstack/react-query";
import { displayModes, statusColors } from "../../config/config";
import { getUserGroupsList } from "../../helper/user-helper";
import ToastMessage from "../../components/ToastMessage";

const UserGroups = (props) => {
  const [groupList, setGroupList] = useState([]);
  const [groupId, setGroupId] = useState(props.groupId ? props.groupId : "");
  const [groupName, setGroupName] = useState("");
  const [warningMsg, setWarningMsg] = useState("");

  const handleChange = (event) => {
    const value = event.target.value;
    setGroupId(value);

    //Pass the `index` prop back to the parent comp. Applicable when this component is displayed from inside a map()
    if (props.index) {
      props.handleChange(value, props.index);
    } else {
      props.handleChange(value);
    }
  };

  const userGroupListQuery = useQuery({
    queryKey: ["groupList"],
    queryFn: async () => {
      const records = await getUserGroupsList(); //await getRecords(branchId);
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
    if (userGroupListQuery.status === "success") {
      setGroupList(userGroupListQuery.data);
    }
  }, [userGroupListQuery.data]);

  useEffect(() => {
    if (props.displayMode != displayModes.EDIT && props.groupId) {
      const selectedGroup = groupList.find((group) => group.U_GroupId === props.groupId);
      if (selectedGroup) {
        setGroupName(selectedGroup.U_GroupName);
      }
    }
  }, [groupList]);

  useEffect(() => {
    if (userGroupListQuery.status === "error") {
      console.log("userGroupListQuery.error: ", JSON.stringify(userGroupListQuery.error));
      setWarningMsg(userGroupListQuery.error.message);
    }
  }, [userGroupListQuery.status]);

  return (
    <>
      {props.displayMode === displayModes.EDIT ? (
        <Input
          bsSize="sm"
          type="select"
          value={groupId}
          style={{ width: "auto" }}
          className={"form-control display-4 text-gray-dark "} //text-sm  + invalidInput.approver
          onChange={(e) => handleChange(e)}
          // disabled={props.displayMode === displayModes.EDIT ? false: true}
        >
          <option key="-" value="">
            {userGroupListQuery.isFetching ? "Loading..." : "Select a Group"}
          </option>
          {groupList.map((group) => (
            <option key={group.U_GroupId} value={group.U_GroupId}>
              {group.U_GroupName}
            </option>
          ))}
        </Input>
      ) : (
        <h4 className="mt-1">{groupName}</h4>
      )}
      {warningMsg && <ToastMessage type={statusColors.WARNING} message={warningMsg} />}
    </>
  );
};

export default UserGroups;
