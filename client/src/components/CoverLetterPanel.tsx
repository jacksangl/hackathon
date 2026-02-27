import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Textarea } from "./ui/textarea";

interface CoverLetterPanelProps {
  content: string;
  onContentChange: (value: string) => void;
  onRegenerate: () => void;
  onDownload: (format: "pdf" | "docx") => void;
  isLoading: boolean;
  hasArtifact: boolean;
  disabled: boolean;
}

export const CoverLetterPanel = ({
  content,
  onContentChange,
  onRegenerate,
  onDownload,
  isLoading,
  hasArtifact,
  disabled,
}: CoverLetterPanelProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cover Letter</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button variant="outline" disabled={disabled || isLoading} onClick={onRegenerate}>
            {isLoading ? "Generating..." : "Regenerate"}
          </Button>
          <Button variant="secondary" disabled={!hasArtifact} onClick={() => onDownload("docx")}>Download DOCX</Button>
          <Button variant="secondary" disabled={!hasArtifact} onClick={() => onDownload("pdf")}>Download PDF</Button>
        </div>
        <Textarea
          className="min-h-[280px]"
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
          placeholder="Cover letter will appear here after analysis."
        />
      </CardContent>
    </Card>
  );
};
