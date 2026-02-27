import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";

export const AtsScoreCard = ({
  atsScore,
  interviewChance,
}: {
  atsScore: number;
  interviewChance: "High Chance" | "Medium Chance" | "Low Chance";
}) => {
  const variant =
    interviewChance === "High Chance"
      ? "success"
      : interviewChance === "Medium Chance"
        ? "warning"
        : "danger";

  return (
    <Card>
      <CardHeader>
        <CardTitle>ATS Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between">
          <p className="text-4xl font-semibold">{atsScore}</p>
          <Badge variant={variant}>{interviewChance}</Badge>
        </div>
        <Progress value={atsScore} />
      </CardContent>
    </Card>
  );
};
