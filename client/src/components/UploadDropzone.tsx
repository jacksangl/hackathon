import { ChangeEvent, DragEvent, useRef } from "react";
import { Upload } from "lucide-react";

import { Button } from "./ui/button";

interface UploadDropzoneProps {
  isLoading: boolean;
  onFileSelected: (file: File) => void;
}

const isValidFile = (file: File) => {
  const name = file.name.toLowerCase();
  return name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".tex");
};

export const UploadDropzone = ({ isLoading, onFileSelected }: UploadDropzoneProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && isValidFile(file)) {
      onFileSelected(file);
    }
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && isValidFile(file)) {
      onFileSelected(file);
    }
  };

  return (
    <div
      className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-white p-6 text-center"
      onDrop={onDrop}
      onDragOver={(event) => event.preventDefault()}
    >
      <Upload className="mb-3 h-6 w-6 text-mutedForeground" />
      <p className="text-sm font-medium">Drop your resume here (.pdf, .docx, .tex)</p>
      <p className="mb-4 text-xs text-mutedForeground">Max 8MB</p>
      <Button
        variant="outline"
        disabled={isLoading}
        onClick={() => inputRef.current?.click()}
      >
        {isLoading ? "Uploading..." : "Choose File"}
      </Button>
      <input ref={inputRef} type="file" className="hidden" onChange={onInputChange} />
    </div>
  );
};
