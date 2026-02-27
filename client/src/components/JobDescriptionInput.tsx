import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

interface JobDescriptionInputProps {
  jobTitle: string;
  company: string;
  jobDescriptionText: string;
  onJobTitleChange: (value: string) => void;
  onCompanyChange: (value: string) => void;
  onJobDescriptionChange: (value: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  disabled: boolean;
}

export const JobDescriptionInput = ({
  jobTitle,
  company,
  jobDescriptionText,
  onJobTitleChange,
  onCompanyChange,
  onJobDescriptionChange,
  onAnalyze,
  isAnalyzing,
  disabled,
}: JobDescriptionInputProps) => {
  return (
    <div className="space-y-3 rounded-lg border bg-white p-5">
      <div>
        <Label htmlFor="job-title">Job Title (optional)</Label>
        <Input id="job-title" value={jobTitle} onChange={(event) => onJobTitleChange(event.target.value)} />
      </div>
      <div>
        <Label htmlFor="company">Company (optional)</Label>
        <Input id="company" value={company} onChange={(event) => onCompanyChange(event.target.value)} />
      </div>
      <div>
        <Label htmlFor="job-description">Job Description</Label>
        <Textarea
          id="job-description"
          className="min-h-[180px]"
          placeholder="Paste the job description here"
          value={jobDescriptionText}
          onChange={(event) => onJobDescriptionChange(event.target.value)}
        />
      </div>
      <Button onClick={onAnalyze} disabled={disabled || jobDescriptionText.length < 20 || isAnalyzing}>
        {isAnalyzing ? "Analyzing..." : "Analyze Resume"}
      </Button>
    </div>
  );
};
