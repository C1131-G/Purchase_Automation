import React, { useEffect, useState } from "react";
import { Input } from "reactstrap";
import { useQuery } from "@tanstack/react-query";
import { displayModes, statusColors } from "../../config/config";
import { getUsersByUserGroup } from "../../helper/user-helper";
import ToastMessage from "../../components/ToastMessage";

const Users = (props) => {
  const [userList, setUserList] = useState([]);
  const [userId, setUserId] = useState(props.userId ? props.userId : "");
  const [userName, setUserName] = useState("");
  const [warningMsg, setWarningMsg] = useState("");

  const handleChange = (event) => {
    const value = event.target.value;
    setUserId(value);

    //Pass the `index` prop back to the parent comp. Applicable when this component is displayed from inside a map()
    if (props.index) {
      props.handleChange(value, props.index);
    } else {
      props.handleChange(value);
    }
  };

  //   const userListQuery = useQuery({
  //     queryKey: ["userList"],
  //     queryFn: async () => {
  //       const records = await getUsersByUserGroup(props.moduleName); //await getRecords(branchId);
  //       return records;
  //     },
  //     // Setting this to `false` will disable this query from automatically running
  //     //Enable the query by default
  //     enabled: true,
  //     staleTime: 1000 * 60 * 60, //time in milliseconds after which the data is considered stale
  //     refetchOnWindowFocus: false
  //   });

  const fetchUserList = async () => {
    const records = await getUsersByUserGroup(props.moduleName); //await getRecords(branchId);
    console.log("Records", records);
    if (records.length > 0) {
      setUserList(records);
    } else {
      console.log("userListQuery.error: No data");
    }
  };

  //componentDidUpdate - set the query results to state
  useEffect(() => {
    fetchUserList();
  }, [userId]);

  useEffect(() => {
    if (props.displayMode != displayModes.EDIT && props.userId) {
      const selectedUser = userList.find((user) => user.U_UserId === props.userId);
      if (selectedUser) {
        setUserName(selectedUser.UserName);
      }
    }
  }, [userList]);

  //   useEffect(() => {
  //     if(userListQuery.status === "error") {
  //       console.log("userListQuery.error: ", JSON.stringify(userListQuery.error));
  //       setWarningMsg(userListQuery.error.message);
  //     }
  //   }, [userListQuery.status]);

  return (
    <>
      {props.displayMode === displayModes.EDIT ? (
        <Input
          bsSize="sm"
          type="select"
          value={userId}
          style={{ width: "auto" }}
          className={"form-control display-4 text-gray-dark "} //text-sm  + invalidInput.approver
          onChange={(e) => handleChange(e)}
          // disabled={props.displayMode === displayModes.EDIT ? false: true}
        >
          <option key="-" value="">
            {"Select a delivery agent"}
          </option>
          {userList.map((user) => (
            <option key={user.U_UserId} value={user.U_UserId}>
              {user.UserName}
            </option>
          ))}
        </Input>
      ) : (
        <h4 className="mt-1">{userName}</h4>
      )}
      {warningMsg && <ToastMessage type={statusColors.WARNING} message={warningMsg} />}
    </>
  );
};

export default Users;
