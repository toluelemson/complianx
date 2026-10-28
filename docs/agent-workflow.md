# Agent workflow

## Roles

### Coordinator

Understands the request, reads instructions, identifies affected domains, creates a bounded plan, assigns non-overlapping ownership, coordinates contracts, integrates results, and runs final verification. The coordinator handles trivial work directly.

### Backend agent

Owns `apps/api/**` and implements NestJS behavior, Prisma queries/migrations, authorization, validation, and backend tests. Coordinates before changing shared contracts.

### Frontend and UX agent

Owns `apps/web/**` and implements React pages, components, forms, routing, accessibility, responsive behavior, and frontend tests. Uses established API contracts.

### Contracts and data agent

Owns `packages/contracts/**` and `apps/api/prisma/**` only when explicitly assigned. Analyzes compatibility and migration impact.

### Verification agent

Normally read-only. Reviews requirement coverage, security boundaries, tenant isolation, accessibility, regressions, and verification results. It must not silently expand scope.

## Collaboration boundaries

Every delegated task receives:

- Goal
- Writable files/directories
- Read-only dependencies
- Files that must not be edited
- Existing behavior to preserve
- Acceptance criteria
- Required tests
- Expected handoff format

Never assign overlapping writable ownership. Shared files belong to the coordinator or require explicit coordination. Agents check the current diff before editing, preserve unrelated changes, report blockers promptly, and never claim checks passed without running them. Final integration belongs to the coordinator.

## Git lifecycle

`Issue → coordinator plan → task branch/worktree → bounded implementation → verification → pull request → CI → human review → merge`.

Suggested branches: `agent/ux-audit`, `agent/assessment-workflow`, `agent/evidence-register`, and `agent/security-review`. Agents should not push directly to `main` during normal feature work. Recommended repository protection requires a pull request, passing CI, review, resolved conversations, and a current branch.

## Critical Neuraldocx journeys

1. Create or join a company workspace.
2. Create an AI-system project.
3. Start an assessment.
4. Save and reload questionnaire answers.
5. Generate preliminary classification.
6. Review applicable requirements.
7. Upload and link evidence.
8. Generate compliance documents.
9. Submit for review, request changes, and approve.
10. Generate/download the compliance package.
11. Confirm another company cannot access the project.

Unit and page tests cover portions of these journeys. Full end-to-end coverage, especially cross-company isolation and complete approval/package flows, remains a gap and must be reported rather than assumed.
