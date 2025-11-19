## AI Compliance Documentation Generator (MVP)

This repository contains a full-stack MVP for generating AI compliance documentation (EU AI Act style technical files, model cards, risk assessments, and NIST AI RMF profiles) from structured wizard inputs. It includes:

- **Backend** – NestJS + Prisma + PostgreSQL + JWT auth, LLM integration, Puppeteer-based PDF rendering.
- **Frontend** – React + TypeScript + Vite + Tailwind + React Hook Form + TanStack Query.
- **Docker** files for both services and Prisma migrations to bootstrap the schema.

### Tech Highlights

- Secure auth (`/auth/signup`, `/auth/login`) with bcrypt + JWT.
- Project management and wizard sections tied to authenticated users.
- LLM abstraction (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`) for technical doc, model card, risk assessment, and NIST AI RMF prompts.
- HTML templates rendered to PDF via Puppeteer and stored locally (`storage/documents`).
- React wizard UI with multi-step forms, framework selection (EU AI Act / Model Card / Risk / NIST AI RMF), evidence attachments with reviewer workflow/versioning, and document downloads.
- Automated tests for critical backend utilities and LLM client wiring.

---

## Backend (`/backend`)

### Prerequisites

- Node.js 20+
- PostgreSQL database
- LLM provider (OpenAI-compatible HTTP endpoint)

### Environment

Copy `.env.example` to `.env` and update values:

```
DATABASE_URL=postgresql://user:password@localhost:5432/ai_compliance
JWT_SECRET=change-me
LLM_BASE_URL=https://api.openai.com
LLM_API_KEY=sk-your-api-key
LLM_MODEL=gpt-4o-mini
FRONTEND_URL=http://localhost:5173
```

### Install & Run

```bash
cd backend
npm install
npx prisma generate
# create migration SQL (or run against a live database)
DATABASE_URL=postgresql://... npx prisma migrate dev --name init
npm run start:dev
```

### Tests

```
npm test
```

### Framework-Specific Generation

`POST /projects/:projectId/generate` accepts an optional body to scope which documents are produced:

```json
{
  "documentTypes": [
    "technical_doc",
    "model_card",
    "risk_assessment",
    "nist_rmf_profile"
  ]
}
```

If omitted, all available deliverables are generated.

### Evidence Attachments

Every wizard section can carry concrete evidence (policies, eval reports, CSVs) stored under `storage/artifacts`:

- `POST /projects/:projectId/sections/:sectionId/artifacts` – multipart upload (`file`, optional `description`).
- `GET /projects/:projectId/sections/:sectionId/artifacts` – list evidence for that step.
- `GET /artifacts/:artifactId/download` – stream the stored file.
- `DELETE /artifacts/:artifactId` – remove the record + file.
- `PATCH /artifacts/:artifactId/review` – Reviewer/Admins approve or reject attachments with comments (`status` ∈ `PENDING | APPROVED | REJECTED`).

### Fairness & Trust Metrics (Beta)

1. `GET /projects/:projectId/metrics` – list trust metrics (pillar, units, recent samples).
2. `POST /projects/:projectId/metrics` – create a new metric (name, pillar, target range, dataset/model).
3. `POST /metrics/:metricId/samples` – upload a measurement (value, optional artifact + note); returns OK/WARN/ALERT based on the configured thresholds.

Each upload is versioned (checksums + citation keys such as `SYSTEM_OVERVIEW-A02`) and the generator automatically appends an Evidence Appendix with inline citation references for auditors.
Use these uploads to cite artifacts in your generated documentation.

### Docker

```bash
cd backend
docker build -t aicd-backend .
docker run --env-file .env -p 3000:3000 aicd-backend
```

> Puppeteer dependencies are baked into the Docker image. Supply `PUPPETEER_EXECUTABLE_PATH` if hosting elsewhere.

---

## Frontend (`/frontend`)

### Prerequisites

- Node.js 20.19+ (Vite 7 enforces this – upgrade if you see the warning during build)

### Environment

```
VITE_API_URL=http://localhost:3000
```

### Install & Run

```bash
cd frontend
npm install
npm run dev
```

### Build

```
npm run build
```

### Design System & Storybook

The frontend includes a lightweight design system that lives under `frontend/src/design-system`. Run Storybook to browse buttons, cards, chips, and typography tokens interactively:

```
cd frontend
npm run storybook
```

You can also build a static Storybook site with `npm run build:storybook`.

### Docker

```bash
cd frontend
docker build -t aicd-frontend .
docker run -p 4173:80 aicd-frontend
```

---

## Sample End-to-End Flow

1. **Sign Up** via `/auth/signup`.
2. **Log In** and grab the issued JWT (frontend stores automatically).
3. **Create a Project** (`POST /projects`).
4. **Add Sections** for each wizard step via `/projects/:id/sections`.
5. **Attach Evidence** to critical sections with `/projects/:id/sections/:sectionId/artifacts` to keep supporting documents next to each answer.
6. **Generate Docs** using `/projects/:id/generate` – pick frameworks (EU AI Act technical file, Model Card, Risk Assessment, NIST AI RMF) in the UI; the backend calls the LLM for each selected mode, renders HTML templates, and stores PDFs.
7. **Download PDFs** from `/documents/:id/download`.

The React app drives this workflow through a guided wizard and compliance document dashboard.

---

## Trust Monitoring Placements (Placeholders)

Before we implement live gauges, reserve UI real estate in these places:

1. **Dashboard Insight Cards** – add “Trust pillar” widgets beside Pending Sections so fairness/robustness/trust scores can live there with status badges.
2. **Project Activity Column** – embed an “AI Trust monitoring” panel under Activity Timeline that currently displays “coming soon” cards for each pillar, then later renders live metrics.
3. **Section Detail Panel** – annotate each wizard step with what trust pillar it addresses and link to relevant evidence (placeholder badges now, metrics later).
4. **Evidence Drawer** – show a stub “Artifact health” block summarizing approved/pending citations so you can swap it with real status counts once monitoring ships.
5. **Document Appendix** – reserve a footnote section where the generated PDFs later enumerate trust KPI results (fairness, robustness, transparency, human oversight, etc.).

Implementing these placeholders early means the front-end will already have spaces for live trust signals when the backend metrics land.

---

## Project Structure

```
backend/
  src/
    auth/, projects/, sections/, documents/, generator/, llm/, pdf/
  prisma/
    schema.prisma, migrations/
frontend/
  src/
    pages/, components/, context/, api/
```

---

## Notes & Next Steps

- Configure a persistent storage bucket (S3/GCS) instead of local filesystem for documents when moving to production.
- Implement background jobs / queueing for long LLM generations if needed.
- Expand tests around auth, project CRUD, and PDF generation utilities.
- Hook up observability (logging/metrics) and production-ready error tracking.

Enjoy building compliant AI documentation!
