# AI Resume Optimization and Career Copilot (MVP)

Production-minded MVP with a clean workflow:

`Upload -> Analyze -> Improve`

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
- `GET /uploaded-resumes`
- `POST /analyze`
- `POST /improve-resume`
- `POST /export-improved-resume`
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

Install server export system tools (`pandoc` + `tectonic`) automatically:

```bash
pnpm deps:server
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

### Uploaded Resumes Contract

`GET /uploaded-resumes`

Response:
- `documents[]` (demo-user scoped)
  - `filePath`
  - `filename`
  - `size`
  - `mimeType`
  - `updatedAt`
  - `createdAt`

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
- `missingQualifications`
- `weakSections`
- `fitVerdict` (`fit` or `not_fit`)
- `disqualifiers` (explicit requirement mismatches)
- `interviewChance`
- `nextSteps`
- `feedback`

### Improve Resume Contract

`POST /improve-resume`

Request body:
- `filePath`
- `jobDescriptionText`
- optional `addedSkill` (if omitted, server selects top missing skill)
- optional `userProfile` fields:
  - `name`, `phone`, `email`, `linkedin`, `github`, `addedSkillExperience`

Behavior:
- Uses the default LaTeX template (`server/templates/default-resume-template.tex`).
- Replaces profile placeholders and injects parsed resume section content into that format.
- If required profile/skill info is missing, response returns `needsInput: true` with prompt fields.
- If user enters `No experience` for skill experience, no fabricated skill-experience bullet is added.

### Export Improved Resume Contract

`POST /export-improved-resume`

Request body:
- `latex`
- `format` (`pdf` | `txt` | `docx` | `doc`)

Behavior:
- Converts improved LaTeX into requested format and streams downloadable file bytes.
- PDF export attempts true LaTeX compile first (`pdflatex/xelatex/lualatex/tectonic`), then falls back to simple PDF if unavailable.
- Debug headers: `X-Export-Mode`, `X-Export-Engine`, `X-Export-Reason`.

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

## Templates

- `server/templates/default-resume-template.tex`
- `server/templates/user-resume-template.tex`

## Generation Rules

- Canonical resume generation rules are documented in `RULES.md`.
- These rules include strict LaTeX argument order, one-page constraints, and bullet/section limits.
