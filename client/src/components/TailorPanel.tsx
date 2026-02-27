import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

interface TailorPanelProps {
  label: string;
  onLabelChange: (value: string) => void;
  onTailor: () => void;
  isLoading: boolean;
  result: { atsScore: number; improvementReason: string } | null;
  disabled: boolean;
}

export const TailorPanel = ({
  label,
  onLabelChange,
  onTailor,
  isLoading,
  result,
  disabled,
}: TailorPanelProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tailor Resume</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Optional version label"
          value={label}
          onChange={(event) => onLabelChange(event.target.value)}
        />
        <Button onClick={onTailor} disabled={disabled || isLoading}>
          {isLoading ? "Tailoring..." : "Tailor Resume"}
        </Button>
        {result ? (
          <div className="rounded-md border bg-muted p-3 text-sm">
            <p className="font-medium">Latest tailored score: {result.atsScore}</p>
            <p className="text-mutedForeground">{result.improvementReason}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
