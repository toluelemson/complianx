# Application verification — 12 September 2026

## Result

**Not ready for an “all features work” sign-off.** The verification found reproducible authorization, validation, storage, and runtime configuration defects. This is a verification report, not a claim of exhaustive coverage of every possible input or role combination. Application source was not changed during this audit; preceding profile fixes and unrelated work were preserved.

## Remediation status — 13 September 2026

- Existing-company signup now requires a valid invitation, with an HTTP regression test proving that a direct `companyId` signup returns `409` and creates no user.
- Section autosave read, write, and delete operations now have cross-tenant E2E coverage.
- Suggestion-feedback reads are tenant-authorized, and feedback creation rejects cross-tenant and mixed project/section identifiers.

The remaining findings and completion criteria below retain the original verification results. Treat the remediated items above as resolved in the current source rather than as current open defects.

## Environments and evidence

- Existing app: frontend `http://localhost:5173`, API `http://localhost:3010`. Used the existing signed-in browser for screen inspection and the earlier profile save/reload checks. A registration attempt failed; it did not create a project in this workspace.
- Isolated app: frontend `http://localhost:5174`, API `http://localhost:3011`, PostgreSQL on `127.0.0.1:55441`, database `neuraldocx_features_test`. Synthetic accounts/projects/files used for HTTP mutations, browser registration, and auth checks.
- A second isolated database, `neuraldocx_populated_test`, exercised the migration history with legacy rows and compliance integration fixtures.
- Existing app data was not reset. Test databases and synthetic files were retained; no deletion, account removal, or production deployment was performed.
- Prisma loaded development integration settings even when the isolated API started outside the repository. The initial exploratory run therefore used development SMTP settings and test-mode Stripe settings. Test recipients were `example.invalid`; no checkout payment was completed. The API was restarted with SMTP, Stripe, and LLM settings explicitly blank. The final recorded HTTP runs used disabled external integrations. Real email delivery and real payment settlement are not certified.
- [HTTP assertion results](http-results.json): 153 checks, 142 passed, 11 failed. Failures are retained as failures, not skipped. The three trust algorithms were separately diagnosed with synthetic files copied to the hard-coded default path; this does not fix the custom-storage failure.
- [Frontend route inventory](route-inventory.json): 36 route patterns identified from the router. Screen inspection alone is not treated as proof that every mutation on a page works.

## Automated checks

| Check | Result |
|---|---|
| API unit tests (`jest --runInBand`) | 18 suites, 82 tests passed |
| Web tests (`vitest run`) | 12 files, 30 tests passed |
| PostgreSQL compliance integration suite | 12 tests passed after running its required populated-migration setup |
| Legacy HTTP e2e suite | **1 test failed**: stale `GET /` expectation requires `200 Hello World!`, actual response is 404; suite also lacks app teardown |
| API Nest build | Passed |
| Web Vite production build | Passed |
| Web TypeScript (`tsc -b`) | Passed |
| Shared contracts build and type-check | Passed |
| API lint | 0 errors, 458 warnings |
| Web lint | 0 errors, 55 warnings |
| Prisma validation | Passed |
| Migration deployment | All 45 migrations applied to fresh local test database |
| Populated migration scenario | Passed; legacy project/section/document retained, migration status current |

No Jest/Vitest tests were skipped. Initial setup mistakes were corrected explicitly: the compliance suite requires its legacy fixtures, and unverified accounts must complete email verification before login. The final assertions use that setup. The review-cycle probe was also corrected to resubmit the project after section-level changes, as required by the workflow.

## Reproduced defects

### Critical: cross-tenant autosave access

`AutoSaveController`/`AutoSaveService` do not check project membership or ownership. With a second tenant's valid token:

- `GET /api/autosave/sections/:sectionId` returns the first tenant's content (200).
- `POST /api/autosave/sections` overwrites the first tenant's content (201) and changes `lastEditorId`.

Normal project/section and evidence download endpoints rejected the same outsider. The autosave endpoints bypass those boundaries. The deletion endpoint also lacks authorization checks by source inspection; deletion was not exercised.

Sources: `apps/api/src/domains/assessments/presentation/controllers/auto-save.controller.ts`, `apps/api/src/domains/assessments/application/auto-save/auto-save.service.ts`.

### Critical: cross-tenant suggestion-feedback disclosure

`GET /api/suggestions/feedback/:sectionId/:fieldName` returns another tenant's stored suggestion feedback (200). The controller validates the JWT but passes neither actor identity nor company context to `listForField`. This was reproduced with two verified test accounts in different companies.

Sources: `apps/api/src/domains/assessments/presentation/controllers/suggestions.controller.ts`, `apps/api/src/domains/assessments/application/suggestions/suggestions.service.ts`.

### Critical: uninvited company enrollment

`POST /api/auth/signup` with an existing `companyId`, a new email, and a password succeeds (201) without an invitation. `AuthService.resolveCompany` checks only whether the company exists. The request creates membership and returns a token. The frontend's “Signups paused” screen does not prevent direct signup through the API.

Source: `apps/api/src/domains/identity-access/application/auth/auth.service.ts`.

### High: optional blank due date prevents registration

The registration form sends `dueDate: ''`; `CreateProjectDto` rejects this as an invalid ISO date (400). Omitting the field succeeds through HTTP; entering `2030-01-01` succeeds through the browser. The modal resets entered values immediately upon submission, including failed submissions, and shows only a generic failure toast.

Sources: `apps/web/src/domains/ai-systems/components/NewProjectModal.tsx`, `apps/api/src/domains/ai-systems/presentation/dto/create-project.dto.ts`.

### High: evidence citation collisions across projects

Creating a section with the same name in two separate projects and uploading one file to each causes the second upload to fail with Prisma P2002 / HTTP 500. Citation keys are generated only from section name and version, while the database enforces global uniqueness. A unique section name was used to continue other evidence tests; the collision was then reproduced separately and remains unfixed.

Sources: `apps/api/src/domains/evidence/application/artifacts/artifacts.service.ts:45`, `apps/api/prisma/schema.prisma:432`.

### High: template creation returns 500

`POST /api/templates` with valid name, sectionName, and JSON content fails. The duplicate-content query passes `content: dto.content` as a Prisma JSON filter, which rejects keys such as `summary`. It needs an appropriate JSON equality filter. Template editing/bulk actions cannot be certified through the normal creation flow while this is broken.

Source: `apps/api/src/domains/regulatory-frameworks/application/templates.service.ts:75`.

### High: package history fails in the running development app

The existing database is missing `CompliancePackage.archiveHash`. The live browser shows “Unable to load package history. Retry”; the API log reports Prisma P2022. The fully migrated isolated database passes package creation and download tests. This is environment/schema drift, not proof that the package code works against the current running database.

Relevant migration: `apps/api/prisma/migrations/20260911120000_immutable_package_archives/`.

### High: trust analysis ignores configured file storage

Fairness, robustness, and drift requests all return 500 with `STORAGE_ROOT=/tmp/neuraldocx-feature-files`. Upload and download use the configured root; trust analysis reads `process.cwd()/storage/artifacts`. The same algorithms return 201 after copying only the synthetic CSV to that default location. Both outcomes are recorded. Custom storage remains broken.

Source: `apps/api/src/domains/assessments/application/trust/trust.service.ts:182` (also 425, 582, 712).

### Medium: missing public session token returns 500

`GET /api/public/eu-ai-act/sessions/:id` without `X-Session-Token` throws a Node argument error when hashing `undefined`; expected an authentication rejection. Authenticated session reads and answer writes pass.

Source: `apps/api/src/domains/regulatory-frameworks/application/public-eu-ai-act/eu-ai-act-public.service.ts:404`.

### Medium: registration modal overflows a short viewport

At the browser's normal viewport (approximately 1220 × 630), the centered modal extends above and below the screen and the submit controls are not reachable by ordinary clicks. Keyboard submission works. The modal needs a viewport height limit and internal scrolling; a full responsive/device matrix was not completed.

### Medium: readiness summaries disagree

The existing project overview reports 5/6 complete, while the guided workspace reports 100% / 6 of 6 but simultaneously flags three missing System Overview fields. A new project displays 0/0 sections and only a generation blocker. These summaries should not imply completed required work merely because a section record exists.

### Security observation: secret-bearing logs

`BillingService` logs the Stripe webhook secret during startup. No secret values are included in this report. Remove that logging. Mock email logging also contains verification/reset links; test logs were not copied into the repository.

### Authentication consistency observation

Signup returns a usable JWT before email verification, while login rejects the same unverified account. Early HTTP checks successfully used that signup token. Decide whether verification is intended to gate workspace access, then enforce that policy consistently.

## Feature coverage

| Feature | Verified behavior | Status / limit |
|---|---|---|
| Landing/navigation/pricing/FAQ | Signed-out landing renders; public navigation links present; marketing tests pass | Screen + automated coverage; external booking not submitted |
| Contact and system-intake funnel | Both browser forms render; valid API request returns success with mock delivery, invalid email rejected | Real sales email delivery not verified |
| Loan-approval demo | Prefilled demo runs in browser and displays a result | Passed runtime path; legal accuracy not audited |
| Signup | Valid API signup, malformed input rejection; UI displays paused-signup state | **Fails enrollment boundary**; frontend pause is not an API restriction |
| Login/logout/protected routing | Verified-account login, wrong password and unverified login rejection; browser login works | Browser logout and signed-out dashboard redirect to login passed |
| Email verification/password recovery | API verify/reset flows, old password rejection and new password login | Mock delivery; actual SMTP delivery not certified |
| Personal profile | Read/update/reload via API; settings screen renders | Passed exercised path |
| Companies and organization profile | Rename, read, valid/blank profile save, validation rejection, persistence, foreign company header rejected | Profile browser save/reload verified earlier; destructive leave/remove not exercised |
| Invitations and roles | Invite/create/read, invite signup, reviewer assignment; role page renders | Local mock delivery; no real membership changes |
| Dashboard/analytics | Lists projects and next actions; analytics endpoint responds | Readiness inconsistencies noted |
| Project registration | API create and browser create with populated due date | **Fails blank optional date**; modal overflow and failed-submit reset |
| Project editing/duplication | API update/reload and clone | Passed exercised paths |
| Organization and AI-system profile pages | Render and persisted company values; API system edits | Profile error/loading/cache fixes from earlier turn retained |
| Private classification | Assessment creation, answer storage/reload, classify/preliminary endpoints | API passes; browser branching, role selection, save, and full reload persistence passed |
| Public checker/result | Full three-step browser questionnaire, result and detailed reasoning; API session/answer flows and quick assess | Missing-token error handling fails; legal accuracy not audited |
| Public PDF export | Clicked export | Download event timed out on mouse activation (3 seconds) and keyboard activation (10 seconds); no expected file found; **not verified**, not labeled a confirmed application defect |
| Public result email | Control present, implemented as mailto | Not sent |
| Guided assessment/section forms | Section create/update/reload, autosave/reload; guided UI renders | **Autosave isolation fails**; completeness summary inconsistent |
| AI field suggestions | LLM unit tests cover request and failure paths | Fallback response and feedback save/read exercised; **cross-tenant feedback disclosure fails**; real provider suggestions not exercised |
| Evidence upload/download | Valid text/CSV upload, exact-byte download and outsider denial | **Same-name cross-project upload collision** |
| Evidence review/linking/expiry | Database integration covers rejected/expired evidence and closure evidence validation | Actual multi-role browser upload/link/review flow not fully exercised |
| Requirements/actions/findings | Screens render; lists respond; integration covers owner boundaries, remediation and reviewer closure | End-to-end database paths pass; not every UI filter/input combination tested |
| Section/project comments | Local comment create/read/resolve via HTTP; messages view renders | No messages sent to real users |
| Review/approval | Submit → review → changes → resubmit → signed section/project approval; persisted APPROVED; edit reopens | Passed HTTP lifecycle with synthetic section fixture; not a completed real compliance assessment |
| Review queues/history/audit | Reviewer queue, project/section history, append-only audit, rollback checks | Passed exercised paths |
| Document generation | Readiness and invalid/incomplete-input rejection; generation lifecycle unit tests | Real LLM/PDF generation blocked from sign-off without configured-provider E2E |
| Document library/downloads | Library renders; list responds; archived fixture bytes included in package integration tests | No newly generated real document verified |
| Packages/manifests/export | Isolated package creation/download; immutable file bytes, hashes, versions, concurrency, rollback and legacy behavior | **Live app package history fails due to missing migration** |
| Templates | List responds, UI controls present | **Creation fails**; downstream template workflows incomplete |
| Metrics/fairness/robustness/drift/cohorts | Metric/sample creation; analysis endpoints return results with default path (including cohorts); numerical correctness beyond the synthetic sample was not exhaustively assessed | **Custom storage fails** |
| Reminders/notifications | Create/update future reminder, list/count, mark-all-read; expiry worker integration | Actual scheduled delivery not certified |
| Billing/usage/paywall | Plan/usage APIs, billing modal, unit tests, unconfigured checkout/portal responses | Real settlement/webhook/portal lifecycle not certified |
| Regulatory pack lifecycle | Seed/publish immutability and classification snapshot integration | Admin deprecation transitions not exercised |
| Destructive lifecycle operations | Static review only for remove/leave/delete/archive | Not performed against user data; no sign-off |
| Database/contracts/build | 45 migrations, populated migration safety, Prisma and TypeScript/build checks | Passed |

## Remaining completion criteria

1. Fix the critical enrollment, autosave, and suggestion-feedback authorization defects first and add HTTP regression tests for both.
2. Fix blank-date submission, evidence key uniqueness, template JSON queries, custom-storage handling, and missing-session-token validation.
3. Apply the reviewed migration to the intended development database and repeat the live package flow; do not use a reset.
4. Correct the stale legacy e2e test and close its Nest application during teardown.
5. Run configured-provider document generation and rendered-PDF/export checks, plus real test-mode billing webhook and SMTP delivery scenarios.
6. Complete destructive-operation authorization checks using dedicated fixtures and explicit approval where needed, broader browser role/filter combinations, and responsive/accessibility coverage.

The presence of passing unit tests does not override the reproduced failures above.

## Browser checks completed after initial inventory

- The public checker completed all three steps, returned a persisted result, and expanded detailed reasoning.
- The prefilled loan-approval demo returned its result.
- Test-account login succeeded. Logout returned to login; direct navigation to `/dashboard` while signed out redirected to login.
- The private questionnaire saved EU-scope and operator-role answers and restored both after a full reload.
- Browser registration with a valid due date created `QA browser registration` in the isolated database, with the date displayed on the overview.
- The trust page displayed metric/sample results from the synthetic HTTP analysis runs, including warning/OK states and the cohort controls.
- Contact and system-intake forms rendered; contact submission was tested through the API with disabled SMTP.
- The signup page deliberately shows “Signups paused” while the API still accepts signup requests.

## Reproduction notes

The ad hoc HTTP probes were executed from `/tmp/neuraldocx-http-verification.cjs`, `/tmp/neuraldocx-workflow-verification.cjs`, `/tmp/neuraldocx-extra-verification.cjs`, `/tmp/neuraldocx-cohort-verification.cjs`, and `/tmp/neuraldocx-misc-verification.cjs`. Their sanitized assertion results are preserved here. They use only the fixed local test API/database. Setup and exploratory reruns are not counted in the 153 final recorded assertions.

Run repository checks from each package using its installed binaries: API `jest --runInBand`, `jest --config test/compliance/jest.json --runInBand`, `nest build`, and `eslint 'src/{domains,platform}/**/*.ts'`; web `vitest run`, `vite build`, `tsc -b`, and `eslint .`; contracts `tsc -p tsconfig.json` and `tsc --noEmit`. The populated migration script was executed using the installed Prisma binary in place of its `corepack pnpm exec prisma` wrapper. No migration SQL was changed.

Use a dedicated local `*_test` database. Explicitly clear SMTP/Stripe/LLM variables for isolated tests because Prisma may load a development `.env` even when the process starts elsewhere. Retained raw temporary logs may include test tokens and should not be published.

Temporary verification frontend/API and PostgreSQL processes were stopped after testing. The test database files and evidence remain in `/tmp`; the original app services were left running.
