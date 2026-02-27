import { useEffect, useMemo, useState } from "react";

import { AppShell } from "../components/AppShell";
import { AtsBreakdownCard } from "../components/AtsBreakdownCard";
import { AtsScoreCard } from "../components/AtsScoreCard";
import { CoverLetterPanel } from "../components/CoverLetterPanel";
import { DownloadMenu } from "../components/DownloadMenu";
import { InterviewPrepPanel } from "../components/InterviewPrepPanel";
import { JobDescriptionInput } from "../components/JobDescriptionInput";
import { ResumeSectionEditor } from "../components/ResumeSectionEditor";
import { SkillGapPanel } from "../components/SkillGapPanel";
import { SuggestionsPanel } from "../components/SuggestionsPanel";
import { TailorPanel } from "../components/TailorPanel";
import { UploadDropzone } from "../components/UploadDropzone";
import { VersionHistoryChart } from "../components/VersionHistoryChart";
import { VersionList } from "../components/VersionList";
import { WorkflowStepper } from "../components/WorkflowStepper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAnalyzeResume } from "../hooks/useAnalyzeResume";
import { useDebouncedSuggestions } from "../hooks/useDebouncedSuggestions";
import { useResumeVersions } from "../hooks/useResumeVersions";
import { useUploadResume } from "../hooks/useUploadResume";
import {
  generateCoverLetter,
  generateInterviewQuestions,
  generateSkillGap,
  getDownloadUrl,
  tailorResume,
} from "../lib/api";
import { AnalyzeResponse, ResumeSections } from "../lib/types";
import { fromTextBlock } from "../lib/utils";

const emptySections: ResumeSections = {
  summary: [],
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  other: [],
};

export const DashboardPage = () => {
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [sections, setSections] = useState<ResumeSections>(emptySections);
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescriptionText, setJobDescriptionText] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [selectedSection, setSelectedSection] = useState<keyof ResumeSections>("experience");
  const [tailorLabel, setTailorLabel] = useState("");
  const [tailorResult, setTailorResult] = useState<{ atsScore: number; improvementReason: string } | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [coverLetterContent, setCoverLetterContent] = useState("");
  const [coverLetterArtifactId, setCoverLetterArtifactId] = useState<string | null>(null);
  const [interviewData, setInterviewData] = useState<AnalyzeResponse["interviewQuestionsStarter"] | null>(null);
  const [skillGapData, setSkillGapData] = useState<AnalyzeResponse["skillGapStarter"] | null>(null);
  const [tab, setTab] = useState("resume");
  const [isTailoring, setIsTailoring] = useState(false);
  const [isCoverLoading, setIsCoverLoading] = useState(false);
  const [isInterviewLoading, setIsInterviewLoading] = useState(false);
  const [isSkillGapLoading, setIsSkillGapLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const upload = useUploadResume();
  const analyze = useAnalyzeResume();
  const versions = useResumeVersions(resumeId);

  useEffect(() => {
    if (versions.data?.versions?.length && !selectedVersionId) {
      setSelectedVersionId(versions.data.versions[versions.data.versions.length - 1].id);
    }
  }, [versions.data, selectedVersionId]);

  const sectionText = useMemo(
    () => (sections[selectedSection] || []).join("\n"),
    [sections, selectedSection],
  );

  const suggestions = useDebouncedSuggestions({
    resumeId,
    section: selectedSection,
    text: sectionText,
    jobDescriptionText,
    enabled: Boolean(resumeId && analysis),
  });

  const workflowStep = useMemo(() => {
    if (!resumeId) {
      return 0;
    }

    if (!analysis) {
      return 1;
    }

    if (!tailorResult) {
      return 2;
    }

    if (tab === "resume") {
      return 3;
    }

    if (tab === "cover" || tab === "interview" || tab === "skillgap") {
      return 4;
    }

    return 5;
  }, [analysis, resumeId, tab, tailorResult]);

  const handleUpload = async (file: File) => {
    setErrorBanner(null);
    setNotice(null);
    const result = await upload.runUpload(file);
    if (!result) {
      setErrorBanner(upload.error ?? "Upload failed");
      return;
    }

    setResumeId(result.resumeId);
    setSections(result.parsedSections);
    setAnalysis(null);
    setTailorResult(null);
    setSelectedVersionId(null);
    setNotice("Resume uploaded and parsed.");
  };

  const handleAnalyze = async () => {
    if (!resumeId) {
      setErrorBanner("Upload a resume first.");
      return;
    }

    setErrorBanner(null);
    setNotice(null);

    const result = await analyze.runAnalyze({
      resumeId,
      jobDescriptionText,
      jobTitle: jobTitle || undefined,
      company: company || undefined,
    });

    if (!result) {
      setErrorBanner(analyze.error ?? "Analysis failed");
      return;
    }

    setAnalysis(result);
    setCoverLetterContent(result.coverLetterStarter);
    setInterviewData(result.interviewQuestionsStarter);
    setSkillGapData(result.skillGapStarter);
    setSelectedVersionId(result.versionId);
    await versions.refresh();
    setNotice("Analysis complete.");
  };

  const handleSectionTextChange = (section: keyof ResumeSections, value: string) => {
    setSections((prev) => ({
      ...prev,
      [section]: fromTextBlock(value),
    }));
  };

  const handleApplyRewrite = async (rewrittenText: string) => {
    handleSectionTextChange(selectedSection, rewrittenText);
    setNotice("Rewrite applied to current section.");

    if (!resumeId || !jobDescriptionText) {
      return;
    }

    setIsTailoring(true);
    try {
      const saved = await tailorResume({
        resumeId,
        jobDescriptionText,
        resumeSections: {
          ...sections,
          [selectedSection]: fromTextBlock(rewrittenText),
        },
        saveOnly: true,
        label: `Edited ${new Date().toISOString().slice(0, 10)}`,
      });

      setTailorResult({
        atsScore: saved.atsScore,
        improvementReason: saved.improvementReason,
      });
      setSelectedVersionId(saved.versionId);
      await versions.refresh();
      setNotice("Edited version saved.");
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : "Failed to save edited version");
    } finally {
      setIsTailoring(false);
    }
  };

  const handleTailor = async () => {
    if (!resumeId) {
      setErrorBanner("Upload a resume first.");
      return;
    }

    setErrorBanner(null);
    setNotice(null);
    setIsTailoring(true);

    try {
      const result = await tailorResume({
        resumeId,
        jobDescriptionText,
        label: tailorLabel || undefined,
      });

      setTailorResult({
        atsScore: result.atsScore,
        improvementReason: result.improvementReason,
      });
      setSelectedVersionId(result.versionId);
      await versions.refresh();
      setNotice("Tailored resume saved as a new version.");
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : "Tailor failed");
    } finally {
      setIsTailoring(false);
    }
  };

  const handleRegenerateCoverLetter = async () => {
    if (!resumeId) {
      return;
    }

    setIsCoverLoading(true);
    setErrorBanner(null);

    try {
      const result = await generateCoverLetter({
        resumeId,
        jobDescriptionText,
      });
      setCoverLetterContent(result.content);
      setCoverLetterArtifactId(result.artifactId);
      setNotice("Cover letter regenerated.");
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : "Failed to generate cover letter");
    } finally {
      setIsCoverLoading(false);
    }
  };

  const handleRegenerateInterview = async () => {
    if (!resumeId) {
      return;
    }

    setIsInterviewLoading(true);
    setErrorBanner(null);

    try {
      const result = await generateInterviewQuestions({ resumeId, jobDescriptionText });
      setInterviewData(result);
      setNotice("Interview prep updated.");
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : "Failed to generate interview prep");
    } finally {
      setIsInterviewLoading(false);
    }
  };

  const handleRegenerateSkillGap = async () => {
    if (!resumeId) {
      return;
    }

    setIsSkillGapLoading(true);
    setErrorBanner(null);

    try {
      const result = await generateSkillGap({ resumeId, jobDescriptionText });
      setSkillGapData(result);
      setNotice("Skill gap analysis updated.");
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : "Failed to generate skill gap");
    } finally {
      setIsSkillGapLoading(false);
    }
  };

  const openDownload = async (id: string, format: "pdf" | "docx" | "tex") => {
    setIsDownloading(true);
    setErrorBanner(null);

    try {
      const response = await getDownloadUrl(id, format);
      window.open(response.downloadUrl, "_blank", "noopener,noreferrer");
      setNotice("Download link opened.");
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : "Download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-5">
        <WorkflowStepper currentStep={workflowStep} />

        {errorBanner ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorBanner}</div> : null}
        {notice ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div> : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <UploadDropzone isLoading={upload.isLoading} onFileSelected={handleUpload} />
          <JobDescriptionInput
            jobTitle={jobTitle}
            company={company}
            jobDescriptionText={jobDescriptionText}
            onJobTitleChange={setJobTitle}
            onCompanyChange={setCompany}
            onJobDescriptionChange={setJobDescriptionText}
            onAnalyze={handleAnalyze}
            isAnalyzing={analyze.isLoading}
            disabled={!resumeId}
          />
        </div>

        {analysis ? (
          <div className="grid gap-5 md:grid-cols-2">
            <AtsScoreCard atsScore={analysis.atsScore} interviewChance={analysis.interviewChance} />
            <AtsBreakdownCard breakdown={analysis.breakdown} />
          </div>
        ) : null}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="resume">Resume</TabsTrigger>
            <TabsTrigger value="cover">Cover Letter</TabsTrigger>
            <TabsTrigger value="interview">Interview Prep</TabsTrigger>
            <TabsTrigger value="skillgap">Skill Gap</TabsTrigger>
          </TabsList>

          <TabsContent value="resume">
            <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-5">
                <ResumeSectionEditor
                  sections={sections}
                  selectedSection={selectedSection}
                  onSectionSelect={setSelectedSection}
                  onSectionTextChange={handleSectionTextChange}
                />
                <SuggestionsPanel
                  data={suggestions.data}
                  isLoading={suggestions.isLoading}
                  error={suggestions.error}
                  onApplyRewrite={handleApplyRewrite}
                />
                <TailorPanel
                  label={tailorLabel}
                  onLabelChange={setTailorLabel}
                  onTailor={handleTailor}
                  isLoading={isTailoring}
                  result={tailorResult}
                  disabled={!analysis || !jobDescriptionText}
                />
              </div>

              <div className="space-y-5">
                <VersionHistoryChart data={versions.data?.progression ?? []} />
                <VersionList
                  versions={versions.data?.versions ?? []}
                  selectedVersionId={selectedVersionId}
                  onSelectVersion={setSelectedVersionId}
                />
                <DownloadMenu
                  disabled={!selectedVersionId || isDownloading}
                  onDownload={(format) => selectedVersionId && openDownload(selectedVersionId, format)}
                />
                {versions.isLoading ? <p className="text-xs text-mutedForeground">Loading versions...</p> : null}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cover">
            <CoverLetterPanel
              content={coverLetterContent}
              onContentChange={setCoverLetterContent}
              onRegenerate={handleRegenerateCoverLetter}
              isLoading={isCoverLoading}
              hasArtifact={Boolean(coverLetterArtifactId)}
              disabled={!analysis}
              onDownload={(format) => coverLetterArtifactId && openDownload(coverLetterArtifactId, format)}
            />
          </TabsContent>

          <TabsContent value="interview">
            <InterviewPrepPanel
              data={interviewData}
              onRegenerate={handleRegenerateInterview}
              isLoading={isInterviewLoading}
              disabled={!analysis}
            />
          </TabsContent>

          <TabsContent value="skillgap">
            <SkillGapPanel
              data={skillGapData}
              onRegenerate={handleRegenerateSkillGap}
              isLoading={isSkillGapLoading}
              disabled={!analysis}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
};
