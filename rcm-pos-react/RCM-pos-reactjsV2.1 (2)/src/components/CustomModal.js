import React, { useState, useEffect } from "react";
import { Card, Row, Col, Button, Modal, Spinner } from "reactstrap";
import DisplayMessage from "./DisplayMessage";
import { statusColors } from "../config/config";

const CustomModal = (props) => {
  // const [isOpen, setIsOpen] = useState(false);
  /**
   * Closes the modal
   **/
  const closeModal = () => {
    if (props.closeModal) {
      props.closeModal();
    }
    // setIsOpen(prevIsOpen => !prevIsOpen);
  };

  // useEffect(() => {
  //   // if(isOpen !== props.isOpen) {
  //     setIsOpen(props.isOpen);
  //   // }
  // }, [props.isOpen]);

  return (
    <>
      <Modal
        autoFocus={props.disableAutoFocus ? false : true}
        size={props.modalSize}
        className="modal-dialog-centered modal-large"
        contentClassName="neo-modal"
        isOpen={props.isOpen}
        // toggle={this.toggleModal}
        backdrop={"static"} //true - clicking outside the Modal will close the Modal.
        //       Modal will have a gray transparent bg
        //false - Modal doesn't close when clicking outside, but the bg will be transparent
        //'static' - Modal doesn't close when clicking outside & it will have a gray bg too
        keyboard={false} //true - pressing Esc button in the Keyboard will close the Modal
        //style={{height: 500+"px", overflow: "auto"}}
      >
        <div className="modal-header mb--4">
          {props.title && <h3 className="mb-1 mt-0">{props.title}</h3>}
          {/* <h3 className="mb-1 mt-0"></h3> */}
          {props.infoMessage && (
            <span className="mb-3">
              <i className="fa fa-info-circle text-primary" /> &nbsp;
              <small>{props.infoMessage}</small>
            </span>
          )}
          {/* {props.isLoading &&
          <>
            <small className="my-2 text-primary">
              Processing... &emsp;
            </small>
            <Spinner color="primary" className="reload-spinner" />
          </>
        } */}
          {/* <button
          aria-label="Close"
          className="close"
          data-dismiss="modal"
          type="button"
          onClick={this.closeModal}
        >
          <span aria-hidden={true} className="text-danger">×</span>
        </button> */}
        </div>
        <div className="modal-body">
          {props.children}

          {/* Modal Footer */}
          <Card className="border-0 mx-2 mt-4 mb-2">
            <Row>
              {!props.isLoading ? (
                <>
                  <Col md="3">
                    {!props.hideCloseButton && (
                      <Button
                        size={props.buttonSize}
                        className="ml-auto" //this will move the 'Submit' button to the left side of the modal
                        color="danger"
                        data-dismiss="modal"
                        type="button"
                        onClick={closeModal}
                      >
                        Close
                      </Button>
                    )}
                  </Col>
                  <Col md="6">
                    {props.warningMsg ? (
                      <DisplayMessage
                        type={statusColors.WARNING}
                        iconSize={"sm"}
                        message={props.warningMsg}
                      />
                    ) : props.successMsg ? (
                      <DisplayMessage
                        type={statusColors.SUCCESS}
                        iconSize={"sm"}
                        message={props.successMsg}
                      />
                    ) : null}
                  </Col>
                  <Col md="3" className="text-right">
                    {props.handleSubmit ? (
                      <Button
                        size={props.buttonSize}
                        color="success"
                        type="button"
                        onClick={props.handleSubmit}
                      >
                        Submit
                      </Button>
                    ) : null}
                  </Col>
                </>
              ) : (
                <>
                  <Col md="9"></Col>
                  <Col md="3" className="text-right">
                    <Button disabled size={props.buttonSize} color="success">
                      <Spinner size="sm" />
                      <span> Processing...</span>
                    </Button>
                  </Col>
                </>
              )}
            </Row>
          </Card>
        </div>
        {/* <div className="modal-footer mt--2">
      </div> */}
      </Modal>
    </>
  );
};

export default CustomModal;
