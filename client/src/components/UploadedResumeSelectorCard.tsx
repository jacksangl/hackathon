import { UploadedResumeDocument } from "../lib/types";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface UploadedResumeSelectorCardProps {
  documents: UploadedResumeDocument[];
  selectedFilePath: string | null;
  isLoading: boolean;
  isDeleting: boolean;
  onSelect: (doc: UploadedResumeDocument) => void;
  onDelete: (doc: UploadedResumeDocument) => void;
  onRefresh: () => void;
}

const formatSize = (size: number | null): string => {
  if (size === null) {
    return "Unknown size";
  }
  return `${(size / 1024).toFixed(1)} KB`;
};

const selectedLabel = (doc: UploadedResumeDocument | null): string => {
  if (!doc) {
    return "No resume selected";
  }
  return `${doc.filename} (${formatSize(doc.size)})`;
};

export const UploadedResumeSelectorCard = ({
  documents,
  selectedFilePath,
  isLoading,
  isDeleting,
  onSelect,
  onDelete,
  onRefresh,
}: UploadedResumeSelectorCardProps) => {
  const selected = documents.find((doc) => doc.filePath === selectedFilePath) || null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Uploaded Resumes (Demo)</CardTitle>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading || isDeleting}>
          {isLoading ? "Refreshing..." : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {!documents.length ? (
          <p className="text-sm text-mutedForeground">No uploaded resumes found yet.</p>
        ) : (
          <>
            <label className="block text-sm font-medium text-foreground" htmlFor="uploaded-resume-select">
              Select uploaded resume
            </label>
            <select
              id="uploaded-resume-select"
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
              value={selectedFilePath || ""}
              onChange={(event) => {
                const doc = documents.find((item) => item.filePath === event.target.value);
                if (doc) {
                  onSelect(doc);
                }
              }}
            >
              <option value="" disabled>
                Choose resume
              </option>
              {documents.map((doc) => (
                <option key={doc.filePath} value={doc.filePath}>
                  {doc.filename}
                </option>
              ))}
            </select>

            <p className="text-xs text-mutedForeground">{selectedLabel(selected)}</p>
            {selected ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onDelete(selected)}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete Selected Resume"}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
};
