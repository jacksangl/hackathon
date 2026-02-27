import { AtsBreakdown } from "../lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";

const metricMap: Array<{ key: keyof AtsBreakdown; label: string }> = [
  { key: "keywordMatch", label: "Keyword Match" },
  { key: "skillRelevance", label: "Skill Relevance" },
  { key: "experienceAlignment", label: "Experience Alignment" },
  { key: "formattingQuality", label: "Formatting Quality" },
];

export const AtsBreakdownCard = ({ breakdown }: { breakdown: AtsBreakdown }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {metricMap.map((metric) => (
          <div key={metric.key} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>{metric.label}</span>
              <span>{breakdown[metric.key]}%</span>
            </div>
            <Progress value={breakdown[metric.key]} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
