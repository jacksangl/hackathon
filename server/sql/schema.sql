create extension if not exists pgcrypto;

create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  original_filename text not null,
  original_file_path text not null,
  parsed_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists job_descriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text,
  company text,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references resumes(id) on delete cascade,
  job_description_id uuid not null references job_descriptions(id) on delete cascade,
  ats_score integer not null,
  keyword_match integer not null,
  skill_relevance integer not null,
  experience_alignment integer not null,
  formatting_quality integer not null,
  missing_skills text[] not null default '{}',
  weak_sections text[] not null default '{}',
  feedback_json jsonb not null,
  interview_chance text not null,
  next_steps text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists resume_versions (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references resumes(id) on delete cascade,
  analysis_id uuid not null references analyses(id) on delete cascade,
  label text not null,
  content_json jsonb not null,
  ats_score integer not null,
  improvement_reason text not null,
  docx_path text,
  pdf_path text,
  tex_path text,
  created_at timestamptz not null default now()
);

create table if not exists generated_artifacts (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references resumes(id) on delete cascade,
  analysis_id uuid references analyses(id) on delete set null,
  type text not null,
  content_json jsonb not null,
  docx_path text,
  pdf_path text,
  created_at timestamptz not null default now()
);

create index if not exists idx_resumes_user_id on resumes(user_id);
create index if not exists idx_versions_resume_id on resume_versions(resume_id);
create index if not exists idx_analyses_resume_id on analyses(resume_id);
create index if not exists idx_job_descriptions_user_id on job_descriptions(user_id);
