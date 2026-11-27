# Workflow refactoring plan

## Delivery strategy

Use additive, route-by-route changes. Preserve existing writes and endpoints;
replace a legacy view only after the canonical stage view has equivalent
authorization, loading, error, and navigation behavior.

## Phase 1 — establish the baseline

- Keep this audit, target workflow, domain model, traceability matrix, and
  verification record current.
- Run focused tests before and after each stage migration, then the repository
  verification suite before release.
- Inventory every route into `ProjectPage` and document its replacement.

## Phase 2 — make the five stages discoverable

- Change project navigation to Overview, Register, Assess, Comply, Review, and
  Report.
- Retain deep links to `/requirements`, `/evidence`, `/findings`, and
  `/documents`; nest or group them under Comply in navigation.
- Keep `/projects/:projectId/compliance-workspace`, `/:sectionKey`, and
  `/ai-systems/:projectId` as compatibility paths until usage and parity are
  verified.

## Phase 3 — consolidate the read model

- Define a project workflow summary response owned by a dedicated application
  query service. It composes facts from existing domains without moving write
  responsibility.
- Move project overview progress and next-action consumers to that response.
- Keep `buildProjectAttention` as a presentation policy until the same
  prioritisation is deliberately moved server-side and tested as one contract.

## Phase 4 — decompose legacy workspace safely

- Extract `ProjectPage.tsx` into thin route/adaptor components and reuse the
  dedicated stage pages.
- Migrate one section at a time, with route tests for direct URL entry and
  browser back/forward behavior.
- When no callers remain, replace the legacy page with a redirect preserving
  project and section context; delete it only in a separate, measured cleanup.

## Phase 5 — strengthen continuous compliance

- Ensure material profile, assessment, regulatory-content, evidence-expiry,
  and approval changes create an observable impact signal.
- Mark affected requirements/documents/packages stale according to explicit
  policy; do not silently claim continued compliance.
- Add queryable history for why a requirement changed and which package was
  affected.

## Rollout gates

1. Existing deep links and company isolation still work.
2. A user can complete each stage without entering the legacy workspace.
3. A reviewer can distinguish waiting work from work assigned to them.
4. Readiness and package generation agree with requirement/evidence approval
   state.
5. Feature usage and error telemetry show no regression before removing an
   adapter route.

## Implemented workflow

The dashboard and project overview use the same tenant-scoped workflow
projection. A project detail request uses
`GET /api/projects/:id/workflow-summary`. The project list includes the same
summary per system. Both read persisted decisions, current supporting
evidence, open findings and recorded package history.

Classification and review controls are shared by the guided pages and the
documentation editor. The requirements page now owns requirement planning,
approval and evidence linking. `/ai-systems/:projectId` redirects to the
overview, and the old project documents URL redirects to Report. Both
redirects preserve query parameters and fragments.

The documentation editor still serves `/compliance-workspace` and section
bookmarks. It contains section forms, templates, suggestions, reminders and
document generation. Report links to the editor for document preparation.

Profile edits and evidence link changes append audit events. The project
summary uses recorded profile, asset, lifecycle and pack changes to surface
reassessment. Evidence expiry and review changes affect current requirement
verification. Approved package archives remain available for inspection.

Deploy the API, client and shared contracts together. Apply the four existing
traceability migrations in order using `prisma migrate deploy`. The workflow
summary and audit changes add no new migration. An application rollback keeps
the additive schema and existing audit records. Exported files and manifests
remain tied to their original snapshots.
