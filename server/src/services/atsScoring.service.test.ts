import { describe, expect, it } from "vitest";

import { ResumeDocument } from "../db/types";
import { scoreResumeAgainstJob } from "./atsScoring.service";

const resumeFixture: ResumeDocument = {
  rawText:
    "Software Engineer with 5 years experience in React, TypeScript, Node, Express, and PostgreSQL. Built REST APIs and improved performance.",
  sections: {
    summary: ["Software Engineer with full-stack experience."],
    experience: [
      "Led development of React and Node applications.",
      "Improved API latency by 30% through query optimization.",
    ],
    education: ["B.S. Computer Science"],
    skills: ["React", "TypeScript", "Node", "Express", "PostgreSQL"],
    projects: ["Built a job matching platform using React and Express."],
    certifications: [],
    other: [],
  },
  extractedKeywords: ["react", "typescript", "node"],
};

describe("scoreResumeAgainstJob", () => {
  it("returns deterministic score and breakdown", () => {
    const jd =
      "Looking for a senior full-stack engineer with 4+ years experience in React, TypeScript, Node, REST API design, and SQL.";

    const result = scoreResumeAgainstJob(resumeFixture, jd);

    expect(result.atsScore).toBeGreaterThanOrEqual(0);
    expect(result.atsScore).toBeLessThanOrEqual(100);
    expect(result.breakdown.keywordMatch).toBeGreaterThan(50);
    expect(result.breakdown.skillRelevance).toBeGreaterThan(50);
  });

  it("flags explicit hard requirement mismatches as not_fit", () => {
    const jd =
      "Minimum requirements: 6+ years experience and graduation year 2024 or later required. Must have Kubernetes and AWS.";

    const result = scoreResumeAgainstJob(resumeFixture, jd);

    expect(result.fitVerdict).toBe("not_fit");
    expect(result.disqualifiers.length).toBeGreaterThan(0);
    expect(result.missingSkills).toEqual(expect.arrayContaining(["kubernetes", "aws"]));
  });
});
