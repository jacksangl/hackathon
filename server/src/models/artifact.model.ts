export interface GeneratedArtifactRow {
  id: string;
  resume_id: string;
  analysis_id: string | null;
  type: string;
  content_json: unknown;
  docx_path: string | null;
  pdf_path: string | null;
  created_at: string;
}
