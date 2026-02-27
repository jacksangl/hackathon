import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface InterviewPrepPanelProps {
  data: {
    behavioral: Array<{ question: string; keyPoints: string[] }>;
    technical: Array<{ question: string; keyPoints: string[] }>;
  } | null;
  onRegenerate: () => void;
  isLoading: boolean;
  disabled: boolean;
}

export const InterviewPrepPanel = ({
  data,
  onRegenerate,
  isLoading,
  disabled,
}: InterviewPrepPanelProps) => {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Interview Preparation</CardTitle>
        <Button variant="outline" onClick={onRegenerate} disabled={disabled || isLoading}>
          {isLoading ? "Refreshing..." : "Regenerate"}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-mutedForeground">Behavioral</h3>
          {(data?.behavioral || []).map((item) => (
            <div key={item.question} className="rounded-md border p-3">
              <p className="text-sm font-medium">{item.question}</p>
              <ul className="mt-1 list-disc pl-5 text-xs text-mutedForeground">
                {item.keyPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-mutedForeground">Technical</h3>
          {(data?.technical || []).map((item) => (
            <div key={item.question} className="rounded-md border p-3">
              <p className="text-sm font-medium">{item.question}</p>
              <ul className="mt-1 list-disc pl-5 text-xs text-mutedForeground">
                {item.keyPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
