import { useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";

import { AppShell } from "../components/AppShell";
import { AtsBreakdownCard } from "../components/AtsBreakdownCard";
import { AtsGaugeCard } from "../components/AtsGaugeCard";
import { ImprovedLatexCard } from "../components/ImprovedLatexCard";
import { JobDescriptionInput } from "../components/JobDescriptionInput";
import { MissingProfilePromptCard } from "../components/MissingProfilePromptCard";
import { ResumeImproveActionCard } from "../components/ResumeImproveActionCard";
import { ResumeImprovementPanel } from "../components/ResumeImprovementPanel";
import { UploadedResumeSelectorCard } from "../components/UploadedResumeSelectorCard";
import { UploadDropzone } from "../components/UploadDropzone";
import { WorkflowStepper } from "../components/WorkflowStepper";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useAnalyzeResume } from "../hooks/useAnalyzeResume";
import { useUploadResume } from "../hooks/useUploadResume";
import {
  deleteUploadedResume,
  exportImprovedResume,
  improveResume,
  listUploadedResumes,
} from "../lib/api";
import {
  AnalyzeResponse,
  ImproveResumeResponse,
  UploadedResumeDocument,
} from "../lib/types";

const comingSoon = ["Cover Letter", "Interview Prep", "Skill Gap", "Version Tracking"];

type MissingField = NonNullable<ImproveResumeResponse["missingFields"]>[number];

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof AxiosError) {
    const responseMessage =
      (error.response?.data as { message?: string } | undefined)?.message;
    return responseMessage || error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
};

export const DashboardPage = () => {
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedFileSize, setUploadedFileSize] = useState<number>(0);
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescriptionText, setJobDescriptionText] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedResumeDocument[]>([]);
  const [isDocumentsLoading, setIsDocumentsLoading] = useState(false);
  const [isDeletingDocument, setIsDeletingDocument] = useState(false);
  const [addedSkill, setAddedSkill] = useState("");
  const [missingFields, setMissingFields] = useState<MissingField[]>([]);
  const [missingFieldValues, setMissingFieldValues] = useState<Record<string, string>>({});
  const [missingMessage, setMissingMessage] = useState<string>("");
  const [improvedLatex, setImprovedLatex] = useState("");
  const [changeSummary, setChangeSummary] = useState<string[]>([]);
  const [isImproving, setIsImproving] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<"pdf" | "doc" | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const upload = useUploadResume();
  const analyze = useAnalyzeResume();

  const loadUploadedDocuments = async () => {
    setIsDocumentsLoading(true);
    try {
      const response = await listUploadedResumes();
      setUploadedDocuments(response.documents);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : "Failed to fetch uploaded resumes");
    } finally {
      setIsDocumentsLoading(false);
    }
  };

  useEffect(() => {
    loadUploadedDocuments();
  }, []);

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
    setImprovedLatex("");
    setMissingFields([]);
    setMissingFieldValues({});
    await loadUploadedDocuments();
    setNotice("Upload complete. Ready for ATS analysis.");
  };

  const runAnalyzeForPath = async (filePath: string) => {
    setErrorBanner(null);
    setNotice(null);

    const result = await analyze.runAnalyze({
      filePath,
      jobDescriptionText,
      jobTitle: jobTitle || undefined,
      company: company || undefined,
    });

    if (!result) {
      setErrorBanner(analyze.error ?? "Analysis failed");
      return false;
    }

    setAnalysis(result);
    setNotice("ATS analysis complete.");
    return true;
  };

  const handleAnalyze = async () => {
    if (!uploadedFilePath) {
      setErrorBanner("Upload a resume first.");
      return;
    }

    await runAnalyzeForPath(uploadedFilePath);
  };

  const handleSelectUploadedDocument = async (doc: UploadedResumeDocument) => {
    setUploadedFilePath(doc.filePath);
    setUploadedFileName(doc.filename);
    setUploadedFileSize(doc.size ?? 0);
    setAnalysis(null);
    setImprovedLatex("");
    setMissingFields([]);
    setMissingFieldValues({});
    setNotice(`Selected ${doc.filename}.`);

    if (jobDescriptionText.trim().length >= 20) {
      await runAnalyzeForPath(doc.filePath);
    }
  };

  const handleDeleteUploadedDocument = async (doc: UploadedResumeDocument) => {
    setIsDeletingDocument(true);
    setErrorBanner(null);
    setNotice(null);
    try {
      await deleteUploadedResume(doc.filePath);
      if (uploadedFilePath === doc.filePath) {
        setUploadedFilePath(null);
        setUploadedFileName("");
        setUploadedFileSize(0);
        setAnalysis(null);
        setImprovedLatex("");
        setMissingFields([]);
        setMissingFieldValues({});
      }
      await loadUploadedDocuments();
      setNotice(`Deleted ${doc.filename}.`);
    } catch (err) {
      setErrorBanner(getApiErrorMessage(err, "Failed to delete uploaded resume"));
    } finally {
      setIsDeletingDocument(false);
    }
  };

  const runImprove = async (profileOverrides?: Record<string, string>) => {
    if (!uploadedFilePath) {
      setErrorBanner("Upload a resume first.");
      return;
    }
    if (!jobDescriptionText || jobDescriptionText.length < 20) {
      setErrorBanner("Paste a full job description before improving.");
      return;
    }

    setIsImproving(true);
    setErrorBanner(null);
    setNotice(null);
    const effectiveSkill = addedSkill.trim() || analysis?.missingSkills?.[0] || "communication";

    try {
      const result = await improveResume({
        filePath: uploadedFilePath,
        jobDescriptionText,
        addedSkill: effectiveSkill,
        userProfile: profileOverrides,
      });

      if (result.needsInput) {
        setMissingFields(result.missingFields || []);
        setMissingMessage(result.message || "Provide missing information.");
        setMissingFieldValues((prev) => ({
          ...result.defaults,
          ...prev,
        }));
        setNotice("Provide missing info to apply improvements.");
        return;
      }

      setMissingFields([]);
      setMissingFieldValues({});
      setImprovedLatex(result.improvedLatex || "");
      setChangeSummary(result.changeSummary || []);
      if (!addedSkill.trim()) {
        setAddedSkill(effectiveSkill);
      }
      setNotice(`Improvements applied and compiled-safe LaTeX generated (skill: ${effectiveSkill}).`);
    } catch (err) {
      setErrorBanner(getApiErrorMessage(err, "Failed to improve resume"));
    } finally {
      setIsImproving(false);
    }
  };

  const handleSubmitMissingFields = async () => {
    await runImprove(missingFieldValues);
  };

  const triggerDownload = (bytes: ArrayBuffer, filename: string, type: string) => {
    const blob = new Blob([bytes], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadImproved = async (format: "pdf" | "doc") => {
    if (!improvedLatex) {
      return;
    }

    setExportingFormat(format);
    setErrorBanner(null);
    setNotice(null);

    try {
      const result = await exportImprovedResume({
        latex: improvedLatex,
        format,
      });

      const mime =
        format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      const filename = format === "doc" ? "optimized-resume.doc" : "optimized-resume.pdf";
      triggerDownload(result.data, filename, mime);

      const exportEngine = result.headers["x-export-engine"] || "unknown";
      setNotice(
        `Downloaded optimized resume as ${format === "doc" ? "DOC" : "PDF"}${format === "pdf" ? ` (engine: ${exportEngine})` : ""}.`,
      );
    } catch (err) {
      setErrorBanner(getApiErrorMessage(err, "Failed to export improved resume"));
    } finally {
      setExportingFormat(null);
    }
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

        <UploadedResumeSelectorCard
          documents={uploadedDocuments}
          selectedFilePath={uploadedFilePath}
          isLoading={isDocumentsLoading}
          isDeleting={isDeletingDocument}
          onRefresh={loadUploadedDocuments}
          onSelect={handleSelectUploadedDocument}
          onDelete={handleDeleteUploadedDocument}
        />

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
            {analysis.fitVerdict === "not_fit" ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <p className="font-semibold">Not Fit For This Job (explicit requirement mismatch)</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {analysis.disqualifiers.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="grid gap-5">
              <AtsGaugeCard atsScore={analysis.atsScore} interviewChance={analysis.interviewChance} />
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
                      {analysis.missingSkills.map((skill) => (
                        <span key={skill} className="rounded bg-accent px-2 py-1 text-xs">
                          {skill}
                        </span>
                        ))}
                      {!analysis.missingSkills.length ? <span className="text-mutedForeground">None flagged.</span> : null}
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wide text-mutedForeground">
                      Missing Qualifications / Requirements
                    </p>
                    <ul className="list-disc space-y-1 pl-5">
                      {analysis.missingQualifications.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                      {!analysis.missingQualifications.length ? (
                        <li className="list-none text-mutedForeground">No explicit requirement gaps detected.</li>
                      ) : null}
                    </ul>
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

            <ResumeImproveActionCard
              addedSkill={addedSkill}
              onAddedSkillChange={setAddedSkill}
              onImprove={() => runImprove()}
              isImproving={isImproving}
              disabled={!uploadedFilePath || !analysis}
            />

            {missingFields.length ? (
              <MissingProfilePromptCard
                message={missingMessage}
                missingFields={missingFields}
                values={missingFieldValues}
                onValueChange={(key, value) =>
                  setMissingFieldValues((prev) => ({
                    ...prev,
                    [key]: value,
                  }))
                }
                onSubmit={handleSubmitMissingFields}
                isLoading={isImproving}
              />
            ) : null}

            {improvedLatex ? (
              <ImprovedLatexCard
                latex={improvedLatex}
                changeSummary={changeSummary}
                onDownload={handleDownloadImproved}
                exportingFormat={exportingFormat}
              />
            ) : null}
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
