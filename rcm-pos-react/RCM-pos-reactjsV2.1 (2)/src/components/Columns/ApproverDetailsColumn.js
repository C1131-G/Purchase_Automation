import React from "react";
import { draftStatus as draftStatusList } from "../../config/config";
import moment from "moment";

export default class ApproverDetailsColumn extends React.Component {
  render() {
    const { approverDetails, multiLevelApproval, showDateTime } = this.props;
    return (
      //Display the Approver name if the current user's role is Originator else...
      // this.props.userRole === userRoles.ORIGINATOR ?
      Array.isArray(approverDetails) && approverDetails.length
        ? approverDetails.map((approver, key) => {
            return (
              <>
                {key === 0 && (
                  <tr>
                    {multiLevelApproval && (
                      <td>
                        <b>Level</b>
                      </td>
                    )}
                    <td>
                      <b>Approver</b>
                    </td>
                    <td>
                      <b>Status</b>
                    </td>
                    {showDateTime && (
                      <td>
                        <b>Date/Time</b>
                      </td>
                    )}
                    {/* <td><b>State</b></td> */}
                  </tr>
                )}
                <tr>
                  {multiLevelApproval && <td>{approver.U_ApprovalLevel}</td>}
                  <td>{approver.Approver}</td>
                  <td>
                    {approver.U_DraftStatus === draftStatusList.PENDING ? (
                      <div className="badge badge-pill badge-warning">{approver.U_DraftStatus}</div>
                    ) : approver.U_DraftStatus === draftStatusList.REJECTED ? (
                      <div className="badge badge-pill badge-danger">{approver.U_DraftStatus}</div>
                    ) : approver.U_DraftStatus === draftStatusList.APPROVED ? (
                      <div className="badge badge-pill badge-success">{approver.U_DraftStatus}</div>
                    ) : approver.U_DraftStatus === draftStatusList.NOT_ASSIGNED ? (
                      <div className="badge badge-pill badge-warning">
                        PENDING {/** Display as PENDING if it is Not Assigned yet*/}
                      </div>
                    ) : approver.U_DraftStatus == draftStatusList.NOT_REQUIRED ? (
                      <div className="badge badge-pill badge-gray">{approver.U_DraftStatus}</div>
                    ) : approver.U_DraftStatus == draftStatusList.GENERATED ? (
                      <div className="badge badge-pill badge-primary">{approver.U_DraftStatus}</div>
                    ) : (
                      approver.U_DraftStatus
                    )}
                  </td>
                  {showDateTime && (
                    /** NOTE: 'LLL' formats the DateTime as in below format June 5, 2021 5:04 PM  */
                    <td>
                      {approver.U_DateTime ? moment(approver.U_DateTime).format("LLL") : "NA"}
                    </td>
                  )}
                  {/* <td>{approver.U_State}</td> */}
                </tr>
              </>
            );
          })
        : "NA"
      // : this.props.userRole === userRoles.APPROVER ?
      //   request.Originator
      // : null
    );
  }
}
