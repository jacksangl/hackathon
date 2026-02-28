import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Textarea } from "./ui/textarea";

interface ImprovedLatexCardProps {
  latex: string;
  changeSummary: string[];
  onDownload: (format: "pdf" | "docx") => Promise<void>;
  exportingFormat: "pdf" | "docx" | null;
}

export const ImprovedLatexCard = ({
  latex,
  changeSummary,
  onDownload,
  exportingFormat,
}: ImprovedLatexCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Improved Resume (LaTeX)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {changeSummary.length ? (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {changeSummary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        <Textarea className="min-h-[420px] font-mono text-xs" value={latex} readOnly />
        <div className="flex flex-wrap gap-2 border-t pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onDownload("pdf")}
            disabled={!!exportingFormat}
          >
            {exportingFormat === "pdf" ? "Exporting PDF..." : "Download PDF"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onDownload("docx")}
            disabled={!!exportingFormat}
          >
            {exportingFormat === "docx" ? "Exporting DOCX..." : "Download DOCX"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
