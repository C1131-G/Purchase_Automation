import { useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";

export interface GoodsIssueAttachmentItem {
  id: string;
  targetPath: string;
  fileName: string;
  attachmentDate: string;
  freeText: string;
}

interface GoodsIssueAttachmentsProps {
  attachments: GoodsIssueAttachmentItem[];
  onAttachmentsChange: (items: GoodsIssueAttachmentItem[]) => void;
}

export function GoodsIssueAttachments({
  attachments,
  onAttachmentsChange,
}: GoodsIssueAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: GoodsIssueAttachmentItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);
      if (!file) continue;
      newAttachments.push({
        id: `${Date.now()}-${i}`,
        targetPath: `C:\\Attachments\\${file.name}`,
        fileName: file.name,
        attachmentDate: new Date().toLocaleDateString("en-GB"),
        freeText: "",
      });
    }

    onAttachmentsChange([...attachments, ...newAttachments]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteSelected = () => {
    if (!selectedId) return;
    onAttachmentsChange(attachments.filter((item) => item.id !== selectedId));
    setSelectedId(null);
  };

  const updateFreeText = (id: string, text: string) => {
    onAttachmentsChange(
      attachments.map((item) => (item.id === id ? { ...item, freeText: text } : item))
    );
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      {/* Hidden native file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
      />

      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
        {/* Left Side: Attachments Table */}
        <div className="flex-1 overflow-x-auto min-h-[200px]">
          <table className="w-full min-w-[800px] text-left text-xs text-zinc-700">
            <thead className="bg-zinc-50 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              <tr>
                <th className="w-[5%] px-3 py-3 text-center">#</th>
                <th className="w-[30%] px-3 py-3">Target Path</th>
                <th className="w-[25%] px-3 py-3">File Name</th>
                <th className="w-[15%] px-3 py-3">Attachment Date</th>
                <th className="w-[25%] px-3 py-3">Free Text</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {attachments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center text-zinc-400">
                    <div className="flex flex-col items-center gap-2">
                      <p className="font-medium">No attachments uploaded yet</p>
                      <p className="text-zinc-500 text-xs">
                        Use the "Browse" button to upload documents.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                attachments.map((item, idx) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`cursor-pointer transition-colors duration-150 ${
                      selectedId === item.id
                        ? "bg-blue-50/70 hover:bg-blue-50"
                        : "hover:bg-zinc-50/50"
                    }`}
                  >
                    <td className="px-3 py-3 text-center font-medium text-zinc-400">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-3 font-mono text-zinc-500 break-all select-all">
                      {item.targetPath}
                    </td>
                    <td className="px-3 py-3 font-semibold text-zinc-800">
                      {item.fileName}
                    </td>
                    <td className="px-3 py-3 text-zinc-600">
                      {item.attachmentDate}
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={item.freeText}
                        onChange={(e) => updateFreeText(item.id, e.target.value)}
                        placeholder="Add note..."
                        className="h-8 w-full rounded-lg border border-transparent bg-zinc-50 px-2.5 text-xs text-zinc-800 outline-none transition hover:border-zinc-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Right Side: Vertical Button Controls */}
        <div className="flex flex-row lg:flex-col gap-2 shrink-0 justify-end lg:justify-start">
          <button
            type="button"
            onClick={handleBrowseClick}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-700 shadow-xs transition cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            Browse
          </button>
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={!selectedId}
            className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold shadow-xs transition ${
              selectedId
                ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 cursor-pointer"
                : "bg-zinc-50 text-zinc-400 border border-zinc-200 cursor-not-allowed opacity-50"
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
