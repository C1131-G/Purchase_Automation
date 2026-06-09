import React from "react";
import PropTypes from "prop-types";
import { draftStatus as draftStatusList, recordState } from "../../config/config";

export default class StatusColumn extends React.Component {
  render() {
    const { status, targetRecord, targetRecDocNum } = this.props;
    return (
      <>
        {[draftStatusList.PENDING, recordState.INACTIVE].includes(status) ? (
          <div className="badge badge-pill badge-warning">{status}</div>
        ) : [draftStatusList.REJECTED, draftStatusList.NOT_ASSIGNED, recordState.CLOSED].includes(
            status,
          ) ? (
          <div className="badge badge-pill badge-danger">{status}</div>
        ) : [draftStatusList.AUTO_APPROVED, recordState.ACTIVE, recordState.OPEN].includes(
            status,
          ) ? (
          <div className="badge badge-pill badge-success">{status}</div>
        ) : [draftStatusList.APPROVED].includes(status) ? (
          <>
            <div className="badge badge-pill badge-success mb-2">{status}</div> <br />
            {targetRecDocNum && (
              <span className="text-green">
                {targetRecord ? targetRecord + "# " : "Target Rec.# "}
                <b>{targetRecDocNum}</b>
              </span>
            )}
          </>
        ) : (
          <div className="badge badge-pill badge-primary">{status}</div>
        )}
      </>
    );
  }
}

StatusColumn.propTypes = {
  status: PropTypes.string.isRequired,
};
