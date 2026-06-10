import React, { useRef, useState } from "react";
import { X, File, UploadCloud } from "lucide-react";
import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";

interface UploadAttachmentCardProps {
  onFileSelect: (file: File | null) => void;
}

export const UploadAttachmentCard = React.forwardRef<{ clearFile: () => void }, UploadAttachmentCardProps>(
  ({ onFileSelect }, ref) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => ({
      clearFile: () => {
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        onFileSelect(null);
      },
    }));

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        if (file) {
          setSelectedFile(file);
          onFileSelect(file);
        }
      }
    };

    const handleRemoveFile = () => {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onFileSelect(null);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file) {
          setSelectedFile(file);
          onFileSelect(file);
        }
      }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
    };

    return (
      <SectionCard title="Attachment" className="mt-4">
        {!selectedFile ? (
          <div
            className="border-2 border-dashed border-zinc-300 rounded-lg p-6 text-center hover:bg-zinc-50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
              accept="image/*,.pdf"
            />
            <UploadCloud className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
            <p className="text-sm text-zinc-600">Click or drag file to upload</p>
            <p className="text-xs text-zinc-400 mt-1">Supports PDF, JPG, PNG</p>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-3 rounded-md">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="bg-blue-100 p-2 rounded shrink-0">
                <File className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-zinc-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              type="button"
              className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 shrink-0 ml-2 rounded transition-colors"
              onClick={handleRemoveFile}
              title="Remove File"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </SectionCard>
    );
  }
);

UploadAttachmentCard.displayName = "UploadAttachmentCard";
