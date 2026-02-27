import { ResumeVersion } from "../lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface VersionListProps {
  versions: ResumeVersion[];
  selectedVersionId: string | null;
  onSelectVersion: (id: string) => void;
}

export const VersionList = ({ versions, selectedVersionId, onSelectVersion }: VersionListProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Version History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {versions.map((version) => (
          <button
            type="button"
            key={version.id}
            onClick={() => onSelectVersion(version.id)}
            className={`w-full rounded-md border p-3 text-left ${
              selectedVersionId === version.id ? "border-primary bg-accent" : "border-border"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{version.label}</p>
              <p className="text-xs text-mutedForeground">ATS {version.ats_score}</p>
            </div>
            <p className="mt-1 text-xs text-mutedForeground">{version.improvement_reason}</p>
          </button>
        ))}
        {!versions.length ? <p className="text-sm text-mutedForeground">No versions yet.</p> : null}
      </CardContent>
    </Card>
  );
};
