# AI Resume Optimization and Career Copilot (MVP)

Production-minded MVP with a clean workflow:

`Upload -> Analyze -> Improve -> Tailor -> Prepare -> Download`

## Tech Stack

- Frontend: React + TypeScript + Tailwind CSS + shadcn-style components
- Backend: Node.js + Express + TypeScript
- AI: Gemini API (`gemini-1.5-flash` by default)
- Parsing: `pdf-parse` (PDF), `mammoth` (DOCX), Pandoc wrapper (TEX)
- Storage/DB: Supabase Storage + Supabase Postgres

## Project Structure

```txt
/client
  /src/components
  /src/pages
  /src/hooks
  /src/lib
/server
  /src/routes
  /src/controllers
  /src/models
  /src/services
  /src/utils
  /src/db
  /src/schemas
  /sql/schema.sql
/fixtures
```

## API Endpoints

- `POST /upload-resume`
- `POST /analyze`
- `POST /rewrite`
- `POST /tailor`
- `POST /cover-letter`
- `POST /interview-questions`
- `POST /skill-gap`
- `GET /resume-versions?resumeId=...`
- `GET /resume/:id`
- `GET /download/:id?format=pdf|docx|tex`

## Supabase Setup

1. Create a Supabase project.
2. Create two buckets (default names below):
- `resume-inputs`
- `resume-outputs`
3. Run SQL from `server/sql/schema.sql` in Supabase SQL editor.

## Environment Variables

### Server (`server/.env`)

Use `server/.env.example` as template.

Required:
- `PORT`
- `DEMO_USER_ID`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET_INPUT`
- `SUPABASE_BUCKET_OUTPUT`

Optional but recommended:
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (default `gemini-1.5-flash`)

### Client (`client/.env`)

Use `client/.env.example`.

- `VITE_API_URL=http://localhost:5000`

## Local Run

Prereqs:
- Node.js 20+
- pnpm
- Pandoc installed and available in PATH
- For PDF exports: `pdflatex` or `tectonic`

Install deps:

```bash
pnpm install
```

Run backend:

```bash
pnpm dev:server
```

Run frontend:

```bash
pnpm dev:client
```

Frontend URL: `http://localhost:5173`
Backend URL: `http://localhost:5000`

## Included MVP Features

- Resume upload with PDF/DOCX/TEX validation
- Resume parsing into structured sections
- Deterministic ATS scoring with weighted breakdown
- AI feedback and section-level rewrite suggestions (debounced)
- Tailor resume generation + version tracking
- ATS progression chart and version history
- Cover letter generation and download
- Interview prep question generation
- Skill gap analysis
- Export/download via Pandoc conversion pipeline

## Fixtures

- `fixtures/sample-resume.tex`
- `fixtures/sample-job-description.txt`

Use these for quick local smoke tests.
