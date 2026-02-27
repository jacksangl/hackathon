import { Pie, PieChart, ResponsiveContainer, Cell } from "recharts";

import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const chanceColor = (chance: "High Chance" | "Medium Chance" | "Low Chance") => {
  if (chance === "High Chance") {
    return "#059669";
  }
  if (chance === "Medium Chance") {
    return "#d97706";
  }
  return "#dc2626";
};

export const AtsGaugeCard = ({
  atsScore,
  interviewChance,
}: {
  atsScore: number;
  interviewChance: "High Chance" | "Medium Chance" | "Low Chance";
}) => {
  const activeColor = chanceColor(interviewChance);
  const chartData = [
    { name: "score", value: Math.max(0, Math.min(atsScore, 100)), color: activeColor },
    { name: "remaining", value: Math.max(0, 100 - atsScore), color: "#e5e7eb" },
  ];

  const badgeVariant =
    interviewChance === "High Chance"
      ? "success"
      : interviewChance === "Medium Chance"
        ? "warning"
        : "danger";

  return (
    <Card>
      <CardHeader>
        <CardTitle>ATS Visual</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid items-center gap-3 md:grid-cols-[160px_1fr]">
          <div className="relative h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={50}
                  outerRadius={72}
                  stroke="none"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-3xl font-semibold">{atsScore}</p>
              <p className="text-xs uppercase tracking-wide text-mutedForeground">out of 100</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-mutedForeground">
              This gauge reflects keyword coverage, skill relevance, experience alignment, and formatting quality.
            </p>
            <Badge variant={badgeVariant}>{interviewChance}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
