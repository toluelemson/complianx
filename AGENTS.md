# Agent instructions

## Project overview

Neuraldocx (Complianx) is a multi-tenant EU AI Act compliance workspace. It helps organizations register AI systems, perform applicability and risk classification, track requirements, collect evidence, generate compliance documents, conduct review and approval, and export audit-ready packages. Compliance conclusions require human verification and must not be presented as definitive legal advice.

## Architecture

- `apps/web`: React, TypeScript, and Vite frontend.
- `apps/api`: NestJS modular-monolith API, domain services, controllers, DTOs, and Prisma access.
- `packages/contracts`: shared frontend/backend TypeScript contracts.
- `apps/api/prisma`: PostgreSQL schema and migrations.
- Authentication uses JWT; company context is resolved from authenticated membership and the active company header.
- Regulatory content lives in the regulatory-frameworks domains and shared packages.
- Evidence and document metadata are stored through the API; generated document files use the configured storage integrations.
- Tests live with the API and web applications; GitHub Actions runs install, build, test, and lint.

## Repository navigation

- `apps/api/src/domains`: business domains and their application/presentation logic.
- `apps/api/src/platform`: authentication, database, AI, payments, and other technical adapters.
- `apps/web/src/app`: routing, providers, and application layout.
- `apps/web/src/domains`: frontend domain pages, components, hooks, and API adapters.
- `apps/web/src/styles`: design tokens and shared visual styles.
- `packages/contracts/src`: shared API and domain types.
- `docs/architecture`, `docs/security`, and `docs/operations`: architecture, threat, and operations documentation.

## Setup and verification

Prerequisites: Node.js 20+, pnpm 10.13.1, and PostgreSQL for API-backed workflows.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm db:generate
pnpm --filter api prisma:migrate       # local development database only
pnpm --filter api seed:eu-ai-act       # optional regulatory seed
pnpm dev:web
pnpm dev:api
pnpm build
pnpm test
pnpm lint
pnpm db:validate
pnpm verify
```

There is no repository Docker Compose script currently. Local PostgreSQL must be provided separately. Never point test commands at production; use a dedicated test database and environment. Deployments should use `prisma migrate deploy`, not `prisma migrate dev`.

## Engineering rules

- Inspect the existing architecture and current diff before editing.
- Reuse existing components, services, contracts, and design tokens.
- Preserve unrelated user changes and keep edits within scope.
- Avoid broad rewrites and unnecessary dependencies.
- Validate external input and use typed contracts.
- Add or update tests for changed behavior.
- Run relevant verification before finishing and report incomplete checks honestly.

## Security rules

- Enforce company and project isolation on the server.
- Derive ownership, actor identity, timestamps, and audit identity from authentication/server context.
- Never commit credentials or log tokens, passwords, or sensitive document contents.
- Validate uploaded files and external URLs.
- Add authorization tests for project-scoped endpoints.
- Require human confirmation for destructive operations.

## Database rules

- Keep Prisma schema and migrations synchronized.
- Never rewrite an applied migration; create a corrective migration.
- Design migrations safely for populated databases, with explicit indexes and foreign keys.
- Define safe deletion behavior and validate with Prisma after schema changes.
- Test tenant-scoped database queries.

## Definition of done

A task is complete only when the requested behavior is implemented, relevant tests/build/lint pass, contracts remain consistent, Prisma checks pass when applicable, authorization is tested when applicable, no tests were skipped, and the agent provides a concise handoff report.

See [the agent workflow](docs/agent-workflow.md) and [the handoff template](docs/agent-handoff-template.md).
