import { useMemo, useState } from "react";

import { AppShell } from "../components/AppShell";
import { AtsBreakdownCard } from "../components/AtsBreakdownCard";
import { AtsGaugeCard } from "../components/AtsGaugeCard";
import { AtsScoreCard } from "../components/AtsScoreCard";
import { JobDescriptionInput } from "../components/JobDescriptionInput";
import { ResumeImprovementPanel } from "../components/ResumeImprovementPanel";
import { UploadDropzone } from "../components/UploadDropzone";
import { WorkflowStepper } from "../components/WorkflowStepper";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useAnalyzeResume } from "../hooks/useAnalyzeResume";
import { useUploadResume } from "../hooks/useUploadResume";
import { AnalyzeResponse } from "../lib/types";

const comingSoon = ["Cover Letter", "Interview Prep", "Skill Gap", "Version Tracking"];

export const DashboardPage = () => {
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedFileSize, setUploadedFileSize] = useState<number>(0);
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescriptionText, setJobDescriptionText] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const upload = useUploadResume();
  const analyze = useAnalyzeResume();

  const workflowStep = useMemo(() => {
    if (!uploadedFilePath) {
      return 0;
    }

    if (!analysis) {
      return 1;
    }

    return 2;
  }, [analysis, uploadedFilePath]);

  const handleUpload = async (file: File) => {
    setErrorBanner(null);
    setNotice(null);

    const result = await upload.runUpload(file);
    if (!result) {
      setErrorBanner(upload.error ?? "Upload failed");
      return;
    }

    setUploadedFilePath(result.filePath);
    setUploadedFileName(result.filename);
    setUploadedFileSize(result.size);
    setAnalysis(null);
    setNotice("Upload complete. Ready for ATS analysis.");
  };

  const handleAnalyze = async () => {
    if (!uploadedFilePath) {
      setErrorBanner("Upload a resume first.");
      return;
    }

    setErrorBanner(null);
    setNotice(null);

    const result = await analyze.runAnalyze({
      filePath: uploadedFilePath,
      jobDescriptionText,
      jobTitle: jobTitle || undefined,
      company: company || undefined,
    });

    if (!result) {
      setErrorBanner(analyze.error ?? "Analysis failed");
      return;
    }

    setAnalysis(result);
    setNotice("ATS analysis complete.");
  };

  return (
    <AppShell>
      <div className="space-y-5">
        <WorkflowStepper currentStep={workflowStep} />

        {errorBanner ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorBanner}</div>
        ) : null}
        {notice ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>
        ) : null}

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
            disabled={!uploadedFilePath}
          />
        </div>

        {uploadedFilePath ? (
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Resume</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm md:grid-cols-2">
              <p>
                <span className="text-mutedForeground">File:</span> {uploadedFileName}
              </p>
              <p>
                <span className="text-mutedForeground">Size:</span> {(uploadedFileSize / 1024).toFixed(1)} KB
              </p>
              <p className="md:col-span-2 break-all">
                <span className="text-mutedForeground">Bucket path:</span> {uploadedFilePath}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {analysis ? (
          <>
            <div className="grid gap-5 md:grid-cols-2">
              <AtsGaugeCard atsScore={analysis.atsScore} interviewChance={analysis.interviewChance} />
              <AtsScoreCard atsScore={analysis.atsScore} interviewChance={analysis.interviewChance} />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <AtsBreakdownCard breakdown={analysis.breakdown} />
              <Card>
                <CardHeader>
                  <CardTitle>Analysis Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wide text-mutedForeground">Top Feedback</p>
                    <ul className="list-disc space-y-1 pl-5">
                      {analysis.feedback.slice(0, 4).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wide text-mutedForeground">Missing Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.missingSkills.slice(0, 8).map((skill) => (
                        <span key={skill} className="rounded bg-accent px-2 py-1 text-xs">
                          {skill}
                        </span>
                      ))}
                      {!analysis.missingSkills.length ? <span className="text-mutedForeground">None flagged.</span> : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <ResumeImprovementPanel
              sections={analysis.resumeSections}
              weakSections={analysis.weakSections}
              sectionRecommendations={analysis.sectionRecommendations}
              feedback={analysis.feedback}
              nextSteps={analysis.nextSteps}
              missingKeywords={analysis.missingKeywords}
            />
          </>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Next Phase Modules</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            {comingSoon.map((item) => (
              <div key={item} className="rounded-md border bg-muted p-3 text-sm">
                <p className="font-medium">{item}</p>
                <p className="text-xs text-mutedForeground">Coming in next implementation step.</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
};
