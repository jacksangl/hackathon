import { useEffect, useMemo, useState } from "react";

import { ResumeSections } from "../lib/types";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const SECTION_ORDER: Array<keyof ResumeSections> = [
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "other",
];

const labelForSection = (section: keyof ResumeSections) => {
  const map: Record<keyof ResumeSections, string> = {
    summary: "Summary",
    experience: "Experience",
    education: "Education",
    skills: "Skills",
    projects: "Projects",
    certifications: "Certifications",
    other: "Other",
  };
  return map[section];
};

interface ResumeImprovementPanelProps {
  sections: ResumeSections;
  weakSections: string[];
  sectionRecommendations: Record<string, string[]>;
  feedback: string[];
  nextSteps: string[];
  missingKeywords: string[];
}

export const ResumeImprovementPanel = ({
  sections,
  weakSections,
  sectionRecommendations,
  feedback,
  nextSteps,
  missingKeywords,
}: ResumeImprovementPanelProps) => {
  const defaultSection = useMemo<keyof ResumeSections>(() => {
    const firstWeak = SECTION_ORDER.find((section) => weakSections.includes(section));
    return firstWeak ?? "experience";
  }, [weakSections]);

  const [selectedSection, setSelectedSection] = useState<keyof ResumeSections>(defaultSection);
  useEffect(() => {
    setSelectedSection(defaultSection);
  }, [defaultSection]);

  const selectedLines = sections[selectedSection] || [];
  const sectionSpecific = sectionRecommendations[selectedSection] || [];
  const isWeak = weakSections.includes(selectedSection);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Resume Sections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-2">
            {SECTION_ORDER.map((section) => {
              const weak = weakSections.includes(section);
              const selected = selectedSection === section;
              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => setSelectedSection(section)}
                  className={`rounded-md border px-3 py-2 text-left text-sm ${
                    selected
                      ? "border-primary bg-accent"
                      : weak
                        ? "border-red-200 bg-red-50"
                        : "border-border bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{labelForSection(section)}</span>
                    {weak ? <Badge variant="danger">Needs Help</Badge> : <Badge variant="success">Good</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-mutedForeground">
                    {sections[section]?.length || 0} lines detected
                  </p>
                </button>
              );
            })}
          </div>

          <div className="rounded-md border bg-muted p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">{labelForSection(selectedSection)}</p>
              {isWeak ? <Badge variant="danger">Needs Improvement</Badge> : <Badge variant="success">Healthy</Badge>}
            </div>
            {selectedLines.length ? (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {selectedLines.slice(0, 8).map((line, idx) => (
                  <li key={`${selectedSection}-${idx}`}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-mutedForeground">No content detected for this section.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Improvement Suggestions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-mutedForeground">For {labelForSection(selectedSection)}</p>
            <ul className="list-disc space-y-1 pl-5">
              {(sectionSpecific.length ? sectionSpecific : feedback.slice(0, 3)).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-mutedForeground">Priority Next Steps</p>
            <ul className="list-disc space-y-1 pl-5">
              {nextSteps.slice(0, 3).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-mutedForeground">Missing Keywords</p>
            <div className="flex flex-wrap gap-2">
              {missingKeywords.slice(0, 8).map((keyword) => (
                <span key={keyword} className="rounded bg-accent px-2 py-1 text-xs">
                  {keyword}
                </span>
              ))}
              {!missingKeywords.length ? <span className="text-mutedForeground">No critical keywords missing.</span> : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
