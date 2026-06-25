import { useRef, useState } from "react";
import {
  Lock,
  Upload,
  Trash2,
  Download,
  FileText,
  Loader2,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  File,
  Eye,
} from "lucide-react";
import { apiClient } from "@/shared/api/client";
import { goeyToast } from "goey-toast";

export interface AttachmentItem {
  id: string;
  targetPath: string;
  fileName: string;
  attachmentDate: string;
  freeText: string;
  sourcePath?: string;
  fileExtension?: string;
}

interface UploadGridProps {
  attachments: AttachmentItem[];
  onAttachmentsChange: (items: AttachmentItem[]) => void;
  moduleName: string;
  readOnly?: boolean;
  loading?: boolean;
}

export function UploadGrid({
  attachments = [],
  onAttachmentsChange,
  moduleName,
  readOnly = false,
  loading = false,
}: UploadGridProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleContainerClick = () => {
    if (!readOnly && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);
      if (file) {
        formData.append("files", file);
      }
    }
    formData.append("moduleName", moduleName);

    setIsUploading(true);
    const toastId = goeyToast.info("Uploading files...", { id: "uploading-toast" });

    try {
      const response = await apiClient<{ success: boolean; files: any[] }>(
        "/api/v1/attachments/upload",
        {
          method: "POST",
          body: formData,
        },
      );

      if (response.success && response.files) {
        const newAttachments: AttachmentItem[] = response.files.map((file, idx) => ({
          id: `${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
          targetPath: `${file.sourcePath}\\${file.fileName}.${file.fileExtension}`,
          fileName: file.fileName,
          fileExtension: file.fileExtension,
          sourcePath: file.sourcePath,
          attachmentDate: file.attachmentDate,
          freeText: "",
        }));

        onAttachmentsChange([...attachments, ...newAttachments]);
        goeyToast.success("Files uploaded successfully", { id: toastId });
      }
    } catch (err: any) {
      goeyToast.error(err.message || "Failed to upload files", { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = (idToDelete: string) => {
    onAttachmentsChange(attachments.filter((item) => item.id !== idToDelete));
  };

  const handleNoteChange = (idToUpdate: string, note: string) => {
    onAttachmentsChange(
      attachments.map((item) => (item.id === idToUpdate ? { ...item, freeText: note } : item)),
    );
  };

  const handleDownload = async (item: AttachmentItem) => {
    const toastId = goeyToast.info("Starting download...");
    try {
      const url = `/api/v1/attachments/download?fileName=${encodeURIComponent(
        item.fileName,
      )}&fileExtension=${encodeURIComponent(item.fileExtension || "")}&sourcePath=${encodeURIComponent(
        item.sourcePath || "",
      )}`;

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}${url}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${item.fileName}.${item.fileExtension || ""}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      goeyToast.success("Downloaded successfully", { id: toastId });
    } catch (err: any) {
      goeyToast.error(err.message || "Download failed", { id: toastId });
    }
  };

  const canPreview = (ext?: string) => {
    const normalized = (ext || "").toLowerCase();
    return ["pdf", "jpg", "jpeg", "png", "gif", "webp", "svg"].includes(normalized);
  };

  const handlePreview = async (item: AttachmentItem) => {
    // Open a blank tab synchronously during the user click event to bypass popup blocker
    const previewTab = window.open("about:blank", "_blank");

    try {
      const url = `/api/v1/attachments/download?fileName=${encodeURIComponent(
        item.fileName,
      )}&fileExtension=${encodeURIComponent(item.fileExtension || "")}&sourcePath=${encodeURIComponent(
        item.sourcePath || "",
      )}`;

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}${url}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to load file preview");
      }

      const getMimeType = (ext?: string) => {
        const normalized = (ext || "").toLowerCase();
        switch (normalized) {
          case "pdf":
            return "application/pdf";
          case "jpg":
          case "jpeg":
            return "image/jpeg";
          case "png":
            return "image/png";
          case "gif":
            return "image/gif";
          case "webp":
            return "image/webp";
          case "svg":
            return "image/svg+xml";
          default:
            return "application/octet-stream";
        }
      };

      const buffer = await response.arrayBuffer();
      const mimeType = getMimeType(item.fileExtension);
      const blob = new Blob([buffer], { type: mimeType });
      const blobUrl = window.URL.createObjectURL(blob);

      if (previewTab) {
        previewTab.location.href = blobUrl;
      }
    } catch (err: any) {
      if (previewTab) {
        previewTab.close();
      }
      goeyToast.error(err.message || "Preview failed");
    }
  };

  function getFileIconInfo(ext?: string) {
    const normalized = (ext || "").toLowerCase();
    switch (normalized) {
      case "pdf":
        return {
          icon: FileText,
          bgColor: "bg-rose-50/70 border border-rose-100/50",
          iconColor: "text-rose-600",
        };
      case "xls":
      case "xlsx":
      case "csv":
        return {
          icon: FileSpreadsheet,
          bgColor: "bg-emerald-50/70 border border-emerald-100/50",
          iconColor: "text-emerald-600",
        };
      case "doc":
      case "docx":
        return {
          icon: FileText,
          bgColor: "bg-blue-50/70 border border-blue-100/50",
          iconColor: "text-blue-600",
        };
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "svg":
      case "webp":
        return {
          icon: FileImage,
          bgColor: "bg-amber-50/70 border border-amber-100/50",
          iconColor: "text-amber-600",
        };
      case "zip":
      case "rar":
      case "7z":
      case "tar":
      case "gz":
        return {
          icon: FileArchive,
          bgColor: "bg-purple-50/70 border border-purple-100/50",
          iconColor: "text-purple-600",
        };
      default:
        return {
          icon: File,
          bgColor: "bg-zinc-50 border border-zinc-200/50",
          iconColor: "text-zinc-500",
        };
    }
  }

  const showList = attachments.length > 0;

  return (
    <div className="flex flex-col h-full gap-2">
      <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <span>ATTACHMENTS</span>
          {readOnly && !loading ? (
            <Lock className="h-3 w-3 text-zinc-400" aria-hidden="true" />
          ) : null}
        </span>
      </label>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-auto md:h-[108px] items-stretch w-full">
          <div className="md:col-span-4 h-[108px] animate-pulse rounded-xl border border-zinc-200 bg-zinc-100/80" />
          <div className="md:col-span-8 flex flex-col gap-2 h-full">
            <div className="h-[50px] animate-pulse rounded-xl border border-zinc-150/60 bg-zinc-50/50" />
            <div className="h-[50px] animate-pulse rounded-xl border border-zinc-150/60 bg-zinc-50/50" />
          </div>
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 ${showList ? "md:grid-cols-12" : ""} gap-4 h-auto md:h-[108px] items-stretch`}
        >
          {/* Upload Box Container */}
          <div
            className={
              showList ? "md:col-span-4 h-[108px] md:h-full flex flex-col" : "w-full h-[108px]"
            }
          >
            {readOnly ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-4 text-center h-full w-full cursor-not-allowed opacity-75 select-none">
                <Lock className="h-5 w-5 text-zinc-400 mb-1.5" />
                <span className="text-xs font-semibold text-zinc-500 block">Upload Locked</span>
                <span className="text-[9px] text-zinc-400 mt-0.5 block text-center">
                  Document is closed
                </span>
              </div>
            ) : (
              <div
                onClick={handleContainerClick}
                className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-linear-to-b from-zinc-50/50 to-zinc-100/50 hover:from-white hover:to-zinc-50 hover:border-blue-400 hover:shadow-xs transition duration-200 p-4 text-center h-full w-full group ${
                  isUploading ? "cursor-not-allowed opacity-75" : "cursor-pointer"
                }`}
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin mb-1.5" />
                ) : (
                  <Upload className="h-5 w-5 text-zinc-400 group-hover:text-blue-500 transition-colors mb-1.5" />
                )}
                <span className="text-xs font-semibold text-zinc-700 group-hover:text-zinc-900 transition-colors block">
                  {isUploading ? "Uploading..." : "Drag & drop or click"}
                </span>
                <span className="text-[9px] text-zinc-400 mt-0.5 block text-center">
                  PDF, Word, Excel, Images (Max 25MB)
                </span>
              </div>
            )}
          </div>

          {/* Right side: Attachments List */}
          {showList && (
            <div className="md:col-span-8 flex flex-col gap-2 h-[220px] md:h-full overflow-y-auto pr-1">
              {attachments.map((item) => {
                const iconInfo = getFileIconInfo(item.fileExtension);
                const FileIcon = iconInfo.icon;

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-zinc-100/85 bg-white p-2.5 shadow-xs hover:border-zinc-200/90 hover:shadow-sm transition-all duration-200"
                  >
                    {/* File Icon Badge */}
                    <div className={`p-2 rounded-lg shrink-0 ${iconInfo.bgColor}`}>
                      <FileIcon className={`h-4.5 w-4.5 ${iconInfo.iconColor}`} />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-2">
                      {/* Filename with preview/download restriction */}
                      <div className="flex flex-col min-w-0 flex-1 md:max-w-[40%]">
                        {canPreview(item.fileExtension) ? (
                          <button
                            type="button"
                            onClick={() => handlePreview(item)}
                            className="text-left text-xs font-semibold text-zinc-700 hover:text-blue-600 truncate hover:underline cursor-pointer"
                            title="Click to preview"
                          >
                            {item.fileName.substring(item.fileName.lastIndexOf("_") + 1)}
                            {item.fileExtension ? `.${item.fileExtension}` : ""}
                          </button>
                        ) : (
                          <span
                            className="text-left text-xs font-semibold text-zinc-700 truncate"
                            title={`${item.fileName}${item.fileExtension ? `.${item.fileExtension}` : ""}`}
                          >
                            {item.fileName.substring(item.fileName.lastIndexOf("_") + 1)}
                            {item.fileExtension ? `.${item.fileExtension}` : ""}
                          </span>
                        )}
                        {item.attachmentDate && (
                          <span className="text-[9px] text-zinc-400 font-medium mt-0.5">
                            Uploaded:{" "}
                            {item.attachmentDate.includes("T")
                              ? item.attachmentDate.split("T")[0]
                              : item.attachmentDate}
                          </span>
                        )}
                      </div>

                      {/* Remarks/Note Input - styled as a modern inline input */}
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={item.freeText}
                          disabled={readOnly}
                          onChange={(e) => handleNoteChange(item.id, e.target.value)}
                          placeholder={readOnly ? "" : "Add remark / note..."}
                          className="w-full h-8 rounded-lg border border-zinc-200/50 bg-zinc-50/70 px-3 text-[11px] text-zinc-700 placeholder:text-zinc-400 hover:bg-zinc-100/40 hover:border-zinc-300/80 focus:border-blue-400 focus:bg-white focus:shadow-xs outline-none transition duration-150 disabled:bg-transparent disabled:border-transparent disabled:text-zinc-500 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {canPreview(item.fileExtension) && (
                        <button
                          type="button"
                          onClick={() => handlePreview(item)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors"
                          title="Preview file"
                        >
                          <Eye className="h-4.5 w-4.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDownload(item)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors"
                        title="Download file"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          title="Delete file"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
