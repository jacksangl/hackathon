export interface ResumeRow {
  id: string;
  user_id: string;
  original_filename: string;
  original_file_path: string;
  parsed_json: unknown;
  created_at: string;
}

export interface ResumeVersionRow {
  id: string;
  resume_id: string;
  analysis_id: string;
  label: string;
  content_json: unknown;
  ats_score: number;
  improvement_reason: string;
  docx_path: string | null;
  pdf_path: string | null;
  tex_path: string | null;
  created_at: string;
}
