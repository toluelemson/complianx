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

## Verification commands

Run from the repository root with a non-production database configuration:

```bash
pnpm verify
pnpm --filter api exec tsc -p tsconfig.json --noEmit --pretty false
pnpm --filter web exec tsc -b --pretty false
pnpm db:validate
pnpm --filter api test:compliance
pnpm --filter api exec jest --config test/jest-e2e.json --runInBand
pnpm test:e2e:ui
```

See [Browser E2E setup](../operations/browser-e2e-tests.md) and
[Compliance workflow verification](../operations/compliance-workflow-verification.md)
for the dedicated database setup.

## Results on 2026-11-27

The original browser suite passed 10 tests before implementation. The baseline
web type check flagged an untyped version-comparison tuple. The existing
package gate also applied incompatible assessment status checks. Both defects
were corrected in the workflow pass.

| Check | Result |
| --- | --- |
| Production build | All six workspace build tasks passed. |
| API and web type checks | Passed on Node 22.23.5. |
| Unit and component tests | 165 API tests and 75 web tests passed. Client guidance tests were replaced with checks against the API contract and database behavior. |
| PostgreSQL integration | 15 tests passed on the populated migration database. |
| API end to end | 11 tests passed. The fictional recruitment scenario uses real HTTP routes for classification, traceability finalization, evidence replacement, finding resolution, review decisions, package creation and verification. |
| Chromium end to end | 11 tests passed, including login setup, guided Review, compatibility redirects, session restoration on reload and tenant isolation. |
| Prisma | Schema validation passed. All 51 migrations applied to a fresh local database and to the legacy fixture. The populated schema matched the Prisma datamodel. |
| Lint | Zero errors. The API reported 423 warnings and the web reported 56 warnings. The main categories were unsafe legacy typing and React hook warnings. |

The package acceptance test uses a deterministic stored PDF to exercise
approval, packaging and integrity checks. Live AI document generation is
outside that test. PostgreSQL checks used dedicated local test databases.
