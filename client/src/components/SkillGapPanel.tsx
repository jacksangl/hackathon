import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface SkillGapPanelProps {
  data: {
    missingSkills: string[];
    skillsToLearn: string[];
    projectIdeas: string[];
    technologiesToStudy: string[];
  } | null;
  onRegenerate: () => void;
  isLoading: boolean;
  disabled: boolean;
}

export const SkillGapPanel = ({
  data,
  onRegenerate,
  isLoading,
  disabled,
}: SkillGapPanelProps) => {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Skill Gap Analysis</CardTitle>
        <Button variant="outline" onClick={onRegenerate} disabled={disabled || isLoading}>
          {isLoading ? "Refreshing..." : "Regenerate"}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-mutedForeground">Missing Skills</h3>
          <ul className="space-y-1 text-sm">
            {(data?.missingSkills || []).map((item) => (
              <li key={item} className="rounded bg-muted px-2 py-1">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-mutedForeground">Practical Next Steps</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {(data?.skillsToLearn || []).map((item) => (
              <li key={item}>Learn: {item}</li>
            ))}
            {(data?.projectIdeas || []).map((item) => (
              <li key={item}>Project: {item}</li>
            ))}
            {(data?.technologiesToStudy || []).map((item) => (
              <li key={item}>Study: {item}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
