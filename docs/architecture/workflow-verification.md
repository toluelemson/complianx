# Workflow verification

## Verification contract

The end-to-end workflow is verified when the following behavior is covered in
tests and exercised against a dedicated local/test database:

| Stage | Required proof |
| --- | --- |
| Register | Create/read/update a project; reject cross-company access. |
| Assess | Save answers, produce a preliminary result, and require the expected human review path. |
| Comply | Map requirements, assign action/owner, attach versioned evidence, and surface rejected/expired proof as a blocker. |
| Review | Submit, request changes, resubmit, and approve with authorized actors and event history. |
| Report | Refuse generation when not ready; generate and verify an immutable package when ready. |
| Navigation | Direct stage links resolve to the correct view, and legacy deep links preserve context while adapters remain. |

## Baseline commands

Run from the repository root with a non-production database configuration:

```bash
pnpm --filter web test -- project-attention.test.ts
pnpm --filter api test -- --runInBand
pnpm build
pnpm test
pnpm lint
pnpm db:validate
```

## Current audit status (2026-11-27)

- Web suite: passed — 32 files and 78 tests, including next-action,
  assessment, requirements, review, package, and traceability coverage.
- API suite: passed — 35 suites and 165 tests, including assessment,
  traceability, requirements, project workflow, readiness, and package
  manifest coverage.
- Repository build: passed — all six Turbo build tasks completed.
- Prisma schema: passed with a non-connecting placeholder `DATABASE_URL`;
  this validates schema structure without contacting a database.
- Lint: passed with 423 pre-existing/project-wide warnings and no errors. The
  warning set includes React effect patterns and unsafe legacy API typings;
  this pass adds no lint error.
- Database-backed E2E: not run in this documentation/refactor pass.
- Local authenticated smoke: previously observed login and an authenticated
  AI-system list request through the local Vite proxy. This does not replace
  the automated checks above.

The local runtime used Node 24.22.3, while the repository declares Node
`>=22.16 <23`; pnpm emitted an engine warning. The checks above passed despite
that mismatch, but release verification should use the declared Node 22 range.

Record command output, environment assumptions, and any known unrelated
failures in the change handoff before declaring a migration complete.
