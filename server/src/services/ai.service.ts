import { GoogleGenerativeAI } from "@google/generative-ai";

import { env } from "../config";
import {
  AiAnalyzeOutput,
  CoverLetterOutput,
  InterviewOutput,
  ResumeDocument,
  RewriteOutput,
  SkillGapOutput,
  TailorOutput,
} from "../db/types";
import { extractKeywords } from "../utils/keywordExtractor";
import {
  buildAnalyzePrompt,
  buildCoverLetterPrompt,
  buildInterviewPrompt,
  buildRewritePrompt,
  buildSkillGapPrompt,
  buildTailorPrompt,
} from "../utils/promptBuilder";

const genAiClient = env.GEMINI_API_KEY ? new GoogleGenerativeAI(env.GEMINI_API_KEY) : null;
const geminiModel = genAiClient ? genAiClient.getGenerativeModel({ model: env.GEMINI_MODEL }) : null;

const parseJsonFromModel = <T>(text: string): T | null => {
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
};

const callModelOrFallback = async <T>(prompt: string, fallback: T): Promise<T> => {
  if (!geminiModel) {
    return fallback;
  }

  try {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text();
    return parseJsonFromModel<T>(text) ?? fallback;
  } catch {
    return fallback;
  }
};

const toRawText = (resume: ResumeDocument): string => {
  return Object.values(resume.sections)
    .flat()
    .join("\n");
};

const withDefaults = <T extends object>(target: Partial<T>, defaults: T): T => {
  return { ...defaults, ...target };
};

export const aiService = {
  analyze: async (params: {
    resume: ResumeDocument;
    jobDescription: string;
    atsScore: number;
    missingSkills: string[];
    weakSections: string[];
  }): Promise<AiAnalyzeOutput> => {
    const fallback: AiAnalyzeOutput = {
      feedback: [
        "Align the most relevant experience bullets to the job description keywords.",
        "Use measurable outcomes in each major experience bullet.",
      ],
      sectionRecommendations: {
        experience: ["Start bullets with strong action verbs and include impact metrics."],
        skills: ["Move role-critical skills into a dedicated top skills block."],
        projects: ["Include one project that directly matches the target domain."],
      },
      missingKeywords: params.missingSkills.slice(0, 10),
      coverLetterStarter:
        "I am excited to apply for this role and bring hands-on experience delivering user-focused solutions, improving systems, and collaborating across teams.",
      interviewQuestionsStarter: {
        behavioral: [
          {
            question: "Tell me about a project where you improved an existing process.",
            keyPoints: ["Context", "Your role", "Measured result"],
          },
        ],
        technical: [
          {
            question: "How would you design and test a robust REST API for this role?",
            keyPoints: ["Data model", "Validation", "Monitoring and error handling"],
          },
        ],
      },
      skillGapStarter: {
        missingSkills: params.missingSkills,
        skillsToLearn: params.missingSkills.slice(0, 4),
        projectIdeas: ["Build a targeted project that uses the top missing skills end-to-end."],
        technologiesToStudy: params.missingSkills.slice(0, 4),
      },
    };

    const prompt = buildAnalyzePrompt(params.resume, params.jobDescription, {
      atsScore: params.atsScore,
      missingSkills: params.missingSkills,
      weakSections: params.weakSections,
    });

    const generated = await callModelOrFallback<Partial<AiAnalyzeOutput>>(prompt, fallback);
    return withDefaults<AiAnalyzeOutput>(generated, fallback);
  },

  rewrite: async (params: {
    section: string;
    text: string;
    jobDescription: string;
    mode: "inline" | "full";
  }): Promise<RewriteOutput> => {
    const jdKeywords = extractKeywords(params.jobDescription, 12);
    const fallback: RewriteOutput = {
      rewrittenText: params.text.replace(/responsible for/gi, "delivered"),
      suggestions: [
        "Start with a stronger action verb.",
        "Add a measurable result where possible.",
      ],
      keywordsUsed: jdKeywords.slice(0, 5),
    };

    const prompt = buildRewritePrompt(params);
    const generated = await callModelOrFallback<Partial<RewriteOutput>>(prompt, fallback);

    return withDefaults<RewriteOutput>(generated, fallback);
  },

  tailor: async (params: { resume: ResumeDocument; jobDescription: string }): Promise<TailorOutput> => {
    const jdKeywords = extractKeywords(params.jobDescription, 12);
    const fallbackResume = {
      ...params.resume.sections,
      summary: [
        ...params.resume.sections.summary,
        `Targeted focus: ${jdKeywords.slice(0, 4).join(", ")}`,
      ].slice(0, 4),
      skills: [...new Set([...params.resume.sections.skills, ...jdKeywords.slice(0, 8)])],
    };

    const fallback: TailorOutput = {
      tailoredResume: {
        rawText: toRawText({ ...params.resume, sections: fallbackResume }),
        sections: fallbackResume,
        extractedKeywords: jdKeywords,
      },
      improvementReason: "Added role-aligned keywords and strengthened key sections for ATS alignment.",
    };

    const prompt = buildTailorPrompt(params.resume, params.jobDescription);
    const generated = await callModelOrFallback<Partial<TailorOutput>>(prompt, fallback);

    const generatedSections = generated.tailoredResume?.sections ?? (generated as any).tailoredResume;

    if (!generatedSections || typeof generatedSections !== "object") {
      return fallback;
    }

    const normalized: ResumeDocument = {
      rawText: Object.values(generatedSections as Record<string, string[]>)
        .flat()
        .join("\n"),
      sections: {
        summary: (generatedSections as any).summary ?? [],
        experience: (generatedSections as any).experience ?? [],
        education: (generatedSections as any).education ?? [],
        skills: (generatedSections as any).skills ?? [],
        projects: (generatedSections as any).projects ?? [],
        certifications: (generatedSections as any).certifications ?? [],
        other: (generatedSections as any).other ?? [],
      },
      extractedKeywords: extractKeywords(
        Object.values(generatedSections as Record<string, string[]>)
          .flat()
          .join("\n"),
      ),
    };

    return {
      tailoredResume: normalized,
      improvementReason: generated.improvementReason ?? fallback.improvementReason,
    };
  },

  coverLetter: async (params: {
    resume: ResumeDocument;
    jobDescription: string;
    tone: string;
  }): Promise<CoverLetterOutput> => {
    const fallback: CoverLetterOutput = {
      content:
        "Dear Hiring Manager,\n\nI am excited to apply for this role. My background aligns with your requirements, especially in delivering measurable outcomes and collaborating across teams. I would welcome the opportunity to contribute and discuss how my experience can support your goals.\n\nSincerely,\nCandidate",
    };

    const prompt = buildCoverLetterPrompt(params.resume, params.jobDescription, params.tone);
    const generated = await callModelOrFallback<Partial<CoverLetterOutput>>(prompt, fallback);

    return withDefaults<CoverLetterOutput>(generated, fallback);
  },

  interviewQuestions: async (params: {
    resume: ResumeDocument;
    jobDescription: string;
  }): Promise<InterviewOutput> => {
    const fallback: InterviewOutput = {
      behavioral: [
        {
          question: "Describe a time you had to prioritize under a tight deadline.",
          keyPoints: ["Situation", "Tradeoff", "Outcome"],
        },
      ],
      technical: [
        {
          question: "How would you improve reliability in a Node.js API?",
          keyPoints: ["Validation", "Retries/timeouts", "Observability"],
        },
      ],
    };

    const prompt = buildInterviewPrompt(params.resume, params.jobDescription);
    const generated = await callModelOrFallback<Partial<InterviewOutput>>(prompt, fallback);

    return withDefaults<InterviewOutput>(generated, fallback);
  },

  skillGap: async (params: { resume: ResumeDocument; jobDescription: string }): Promise<SkillGapOutput> => {
    const missing = extractKeywords(params.jobDescription, 20).filter(
      (keyword) => !toRawText(params.resume).toLowerCase().includes(keyword.toLowerCase()),
    );

    const fallback: SkillGapOutput = {
      missingSkills: missing.slice(0, 8),
      skillsToLearn: missing.slice(0, 5),
      projectIdeas: [
        "Build a small full-stack project that demonstrates the top two missing skills.",
      ],
      technologiesToStudy: missing.slice(0, 5),
    };

    const prompt = buildSkillGapPrompt(params.resume, params.jobDescription);
    const generated = await callModelOrFallback<Partial<SkillGapOutput>>(prompt, fallback);

    return withDefaults<SkillGapOutput>(generated, fallback);
  },
};
