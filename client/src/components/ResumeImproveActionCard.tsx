import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface ResumeImproveActionCardProps {
  addedSkill: string;
  onAddedSkillChange: (value: string) => void;
  onImprove: () => void;
  isImproving: boolean;
  disabled: boolean;
}

export const ResumeImproveActionCard = ({
  addedSkill,
  onAddedSkillChange,
  onImprove,
  isImproving,
  disabled,
}: ResumeImproveActionCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Improve Entire Resume</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor="added-skill">Added Skill</Label>
          <Input
            id="added-skill"
            placeholder="Example: Kubernetes (optional)"
            value={addedSkill}
            onChange={(event) => onAddedSkillChange(event.target.value)}
          />
          <p className="mt-1 text-xs text-mutedForeground">
            Optional. If empty, the app picks the top missing job skill automatically.
          </p>
        </div>
        <Button onClick={onImprove} disabled={disabled || isImproving}>
          {isImproving ? "Improving..." : "Improve and Apply to Entire Resume"}
        </Button>
      </CardContent>
    </Card>
  );
};
