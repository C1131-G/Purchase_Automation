import { useRef } from "react";
import { Lock, Upload } from "lucide-react";

interface AddressUploadPanelProps {
  readOnly?: boolean;
  loading?: boolean;
}

export function AddressUploadPanel({ readOnly = false, loading = false }: AddressUploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleContainerClick = () => {
    if (!readOnly) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
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
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={() => {
          // Purely visual for now, no file processing
        }}
      />
      {loading ? (
        <div className="h-[92px] animate-pulse rounded-xl border border-zinc-200 bg-zinc-100" />
      ) : readOnly ? (
        <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-center p-4 h-[92px] cursor-not-allowed">
          <Upload className="h-5 w-5 text-zinc-300 mb-1.5" />
          <span className="text-xs font-medium text-zinc-400 block">No files uploaded</span>
        </div>
      ) : (
        <div
          onClick={handleContainerClick}
          className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/50 hover:border-zinc-300 transition duration-150 cursor-pointer p-4 text-center h-[92px]"
        >
          <Upload className="h-5 w-5 text-zinc-400 mb-1.5" />
          <span className="text-xs font-medium text-zinc-600 block">
            Drag & drop files or click to browse
          </span>
          <span className="text-[10px] text-zinc-400 mt-0.5 block">
            Supports PDF, Word (Max 25MB)
          </span>
        </div>
      )}
    </div>
  );
}
