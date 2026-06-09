import React, { Suspense, useState, useContext, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
// reactstrap components
import { Row, Col } from "reactstrap";

import Header from "../../components/Headers/Header";
import StatusColumn from "../../components/Columns/StatusColumn";
import ToastMessage from "../../components/ToastMessage";
import PageContainer from "../../components/PageContainer";
import RecordsTable from "../components/RecordsTable";

import { displayModes, statusColors } from "../../config/config";
import { formatDate } from "../../config/util";
import { getUsersSessionLog } from "../../helper/users-session-log";
import { UserPermissionsContext } from "../../contexts/UserPermissionsContext";

const UsersSession = () => {
  const { checkUserPermission } = useContext(UserPermissionsContext);
  const queryKey = "usersSessionLog";
  const primaryKeyField = "userSessionLogId";
  const recordType = "UserSession";
  const title = "User Sessions";
  const subTitle = "View user session logs";

  const [displayMode, setDisplayMode] = useState(displayModes.VIEW);
  const [isLoading, setIsLoading] = useState(false);
  const [reloadData, setReloadData] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [warningMsg, setWarningMsg] = useState("");

  const headerColumns = [
    { label: "#", sortField: "userSessionLogId" },
    { label: "Username", sortField: "userName" },
    { label: "Location", sortField: "storeLocation" },
    { label: "Counter Code", sortField: "counterCode" },
    { label: "Counter Name", sortField: "counterName" },
    { label: "Status", sortField: "sessionStatus" },
    { label: "Client IP", sortField: "clientIp" },
    { label: "Login Time", sortField: "userSessionLogId" },
    { label: "Logout Time", sortField: "logoutTime" },
  ];

  const handleRefresh = () => {
    setReloadData(true);
  };

  const TableContent = ({ record, index }) => {
    return (
      <>
        <tr>
          <td>{index + 1}</td>
          <td className="font-weight-800">{record.userName}</td>
          <td className="font-weight-600 text-info">
            {record.storeLocation ? record.storeLocation : ""}
          </td>
          <td className="font-weight-600 text-info">{record.counterCode}</td>
          <td className="font-weight-600 text-info">{record.counterName}</td>
          <td>
            <StatusColumn status={record.sessionStatus} />
          </td>
          <td>{record.clientIp}</td>
          <td>{formatDate(record.loginTime, "MMMM D, YYYY hh:mm")}</td>
          <td>{record.logoutTime ? formatDate(record.logoutTime, "MMMM D, YYYY hh:mm") : "NA"}</td>
        </tr>
      </>
    );
  };

  return (
    <>
      <Header />
      {/* Page content */}
      <PageContainer
        title={title}
        subTitle={subTitle}
        displayMode={displayMode}
        isLoading={isLoading}
        isRecordsAvailable={true}
        handleRefresh={handleRefresh}
      >
        <RecordsTable
          recordType={recordType}
          enableDelete={false}
          primaryKeyField={primaryKeyField}
          queryKey={queryKey}
          headerColumns={headerColumns}
          displayMode={displayMode}
          reloadData={reloadData}
          getRecordHelper={getUsersSessionLog}
          setDisplayMode={setDisplayMode}
          setSuccessMsg={setSuccessMsg}
          setWarningMsg={setWarningMsg}
          tableContent={TableContent}
        />
      </PageContainer>

      {successMsg ? (
        <ToastMessage type={statusColors.SUCCESS} message={successMsg} />
      ) : warningMsg ? (
        <ToastMessage type={statusColors.WARNING} message={warningMsg} />
      ) : null}
    </>
  );
};

export default UsersSession;
