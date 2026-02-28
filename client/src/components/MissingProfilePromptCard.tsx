import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface MissingProfilePromptCardProps {
  message?: string;
  missingFields: Array<{
    key: "name" | "phone" | "email" | "linkedin" | "github" | "addedSkillExperience";
    label: string;
    hint: string;
  }>;
  values: Record<string, string>;
  onValueChange: (key: string, value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export const MissingProfilePromptCard = ({
  message,
  missingFields,
  values,
  onValueChange,
  onSubmit,
  isLoading,
}: MissingProfilePromptCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Missing Information Required</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-mutedForeground">
          {message || "Provide missing fields. For skill experience, you may type 'No experience'."}
        </p>

        {missingFields.map((field) => (
          <div key={field.key}>
            <Label htmlFor={`missing-${field.key}`}>{field.label}</Label>
            <Input
              id={`missing-${field.key}`}
              value={values[field.key] || ""}
              onChange={(event) => onValueChange(field.key, event.target.value)}
              placeholder={field.hint}
            />
            <p className="mt-1 text-xs text-mutedForeground">{field.hint}</p>
          </div>
        ))}

        <Button onClick={onSubmit} disabled={isLoading}>
          {isLoading ? "Applying..." : "Apply Improvements"}
        </Button>
      </CardContent>
    </Card>
  );
};
