import { ResumeSections } from "../lib/types";
import { Textarea } from "./ui/textarea";

const SECTION_ORDER: Array<keyof ResumeSections> = [
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "other",
];

interface ResumeSectionEditorProps {
  sections: ResumeSections;
  selectedSection: keyof ResumeSections;
  onSectionSelect: (section: keyof ResumeSections) => void;
  onSectionTextChange: (section: keyof ResumeSections, value: string) => void;
}

export const ResumeSectionEditor = ({
  sections,
  selectedSection,
  onSectionSelect,
  onSectionTextChange,
}: ResumeSectionEditorProps) => {
  return (
    <div className="space-y-3 rounded-lg border bg-white p-5">
      <div className="flex flex-wrap gap-2">
        {SECTION_ORDER.map((section) => (
          <button
            key={section}
            type="button"
            onClick={() => onSectionSelect(section)}
            className={`rounded-md border px-3 py-1 text-xs font-medium uppercase tracking-wide ${
              selectedSection === section
                ? "border-foreground bg-accent text-foreground"
                : "border-border bg-white text-mutedForeground"
            }`}
          >
            {section}
          </button>
        ))}
      </div>
      <Textarea
        className="min-h-[220px]"
        value={(sections[selectedSection] || []).join("\n")}
        onChange={(event) => onSectionTextChange(selectedSection, event.target.value)}
      />
      <p className="text-xs text-mutedForeground">
        Live suggestions are generated while you edit this section.
      </p>
    </div>
  );
};
