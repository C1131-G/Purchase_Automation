import React, { useState, forwardRef, useImperativeHandle, useRef } from "react";
import { Button, Card, CardBody } from "reactstrap";

const HeaderUploadAttachmentCard = forwardRef(({ onFileSelect }, ref) => {
  const fileInputRef = useRef();
  useImperativeHandle(ref, () => ({
    clearFile() {
      if (fileInputRef.current) {
        fileInputRef.current.value = null; // clear input field
        setPreviewUrl("");
      }
    },
  }));

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    if (file) {
      if (file.type.startsWith("image/")) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl("");
      }
      onFileSelect(file); // send to parent
    }
  };

  return (
    <Card className="shadow">
      <CardBody className="text-sm">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,application/pdf"
            onChange={handleFileChange}
          />

          {previewUrl && (
            <img
              src={previewUrl}
              alt="Preview"
              style={{
                width: "100px",
                height: "100px",
                objectFit: "cover",
                border: "1px solid #ccc",
              }}
            />
          )}

          {/* <Button
                        color="info"
                        className="btn-square"
                        size="lg"
                        onClick={() => selectedFile && onFileSelect(selectedFile)}
                    >
                        Upload
                    </Button> */}
        </div>
      </CardBody>
    </Card>
  );
});

export default HeaderUploadAttachmentCard;
