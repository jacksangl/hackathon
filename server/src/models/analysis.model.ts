export interface AnalysisRow {
  id: string;
  resume_id: string;
  job_description_id: string;
  ats_score: number;
  keyword_match: number;
  skill_relevance: number;
  experience_alignment: number;
  formatting_quality: number;
  missing_skills: string[];
  weak_sections: string[];
  feedback_json: unknown;
  interview_chance: string;
  next_steps: string[];
  created_at: string;
}
