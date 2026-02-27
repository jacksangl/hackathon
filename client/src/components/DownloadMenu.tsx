import { Download } from "lucide-react";

import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface DownloadMenuProps {
  disabled: boolean;
  onDownload: (format: "pdf" | "docx" | "tex") => void;
}

export const DownloadMenu = ({ disabled, onDownload }: DownloadMenuProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Download</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <Button variant="outline" disabled={disabled} onClick={() => onDownload("pdf")}>
          <Download className="mr-2 h-4 w-4" /> PDF
        </Button>
        <Button variant="outline" disabled={disabled} onClick={() => onDownload("docx")}>
          <Download className="mr-2 h-4 w-4" /> DOCX
        </Button>
        <Button variant="outline" disabled={disabled} onClick={() => onDownload("tex")}>
          <Download className="mr-2 h-4 w-4" /> TEX
        </Button>
      </CardContent>
    </Card>
  );
};
