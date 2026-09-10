# API agent instructions

The API is a NestJS modular monolith. Keep domain behavior in `src/domains`, technical integrations in `src/platform`, and shared cross-domain utilities in `src/shared`.

- Controllers translate HTTP requests and responses; services own business rules and authorization; Prisma access remains in application services or repositories used by the domain.
- Every DTO must validate external input with the existing class-validator conventions.
- Use Prisma transactions for multi-write operations that must be atomic.
- Return the repository's established NestJS exception shapes; do not leak database errors or secrets.
- Resolve the active company through authenticated membership, not a body field.
- Every project-scoped endpoint must verify: authenticated user → active company membership → project belongs to company → required project role → referenced child belongs to project.
- Apply the same parent-project check to assessments, answers, requirements, evidence, documents, comments, and review records.
- Reviewer and approver actions must verify the assigned project role server-side.
- Evidence and documents must be readable only through authorized project/company access.
- Audit events must be append-only and actor identity/timestamps must come from server context.
- Never trust `userId`, `companyId`, `answeredById`, `uploadedById`, `reviewedById`, `approvedById`, or client audit timestamps.
- Coordinate before changing `packages/contracts` or Prisma schema/migrations.
- Add unit/integration/e2e coverage for authorization, tenant isolation, validation, and important workflow transitions.

Use `pnpm --filter api test`, `pnpm --filter api test:e2e`, `pnpm --filter api lint`, `pnpm --filter api build`, `pnpm db:validate`, and `pnpm db:generate` as applicable.
