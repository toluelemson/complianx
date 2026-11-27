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
