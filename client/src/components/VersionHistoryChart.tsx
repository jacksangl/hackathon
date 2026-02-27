import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface VersionHistoryChartProps {
  data: Array<{
    versionId: string;
    label: string;
    atsScore: number;
    createdAt: string;
  }>;
}

export const VersionHistoryChart = ({ data }: VersionHistoryChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ATS Progression</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="atsScore" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
