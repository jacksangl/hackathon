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
- `GET /resume-versions?resumeId=...` (next phase)
- `GET /resume/:id` (next phase)
- `GET /download/:id?format=pdf|docx|tex` (next phase)

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

- `VITE_API_URL=http://localhost:5001`

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
Backend URL: `http://localhost:5001`

Initialize Supabase buckets (run once after setting `server/.env`):

```bash
pnpm --filter resume-copilot-server buckets:init
```

Current phase behavior:
- `POST /upload-resume` validates file type and uploads to Supabase bucket.
- `POST /analyze` reads the uploaded file from bucket using `filePath`, parses it, computes ATS score, and runs Gemini feedback.
- No Postgres dependency is required for upload/analyze in this phase.

### Upload Contract

`POST /upload-resume` (multipart form field: `file`)

Response:
- `uploadId`
- `filePath`
- `filename`
- `size`
- `mimeType`
- `warnings`

### Analyze Contract

`POST /analyze`

Request body:
- `filePath`
- `jobDescriptionText`
- optional `jobTitle`
- optional `company`

Response includes:
- `atsScore`
- `breakdown`
- `missingSkills`
- `weakSections`
- `interviewChance`
- `nextSteps`
- `feedback`

## Included Phase 1 Features

- Bucket-based resume upload with PDF/DOCX/TEX validation
- Analyze by uploaded `filePath` (no DB dependency)
- Deterministic ATS scoring with weighted breakdown
- Gemini-backed resume feedback with safe fallback output
- ATS visual card + breakdown in frontend

## Fixtures

- `fixtures/sample-resume.tex`
- `fixtures/sample-job-description.txt`

Use these for quick local smoke tests.
