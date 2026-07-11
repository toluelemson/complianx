# Complianx

Complianx helps teams document AI systems, assess compliance and trust, collect evidence, run review and approval workflows, and generate reports.

## Repository structure

This repository is a pnpm/Turborepo monorepo containing a modular NestJS API and React web application.

```text
apps/api       NestJS modular monolith and Prisma schema
apps/web       Vite/React web application
apps/worker    documented placeholder for future async workloads
packages/contracts  framework-neutral shared API contracts
packages/config     shared configuration placeholder
packages/testing    shared testing placeholder
infrastructure      deployment and operational assets
docs                architecture, decisions, security, and operations
```

Review approval, assessments, evidence, reporting, and identity access now live under `apps/api/src/domains`. Other business modules remain at compatibility paths and migrate incrementally. Low-risk technical adapters live under `apps/api/src/platform`.

## Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL

## Setup

```bash
pnpm install
cp apps/api/.env.example apps/api/.env # when the example is available, otherwise create .env
pnpm --filter api prisma:generate
```

Configure `DATABASE_URL`, `JWT_SECRET`, frontend/API URLs, email, LLM, and Stripe variables as needed. Secrets stay in local or deployment environment configuration and must not be committed.

## Workspace commands

```bash
pnpm dev          # all development tasks
pnpm dev:web      # Vite web app
pnpm dev:api      # Nest API
pnpm build
pnpm test
pnpm lint
pnpm build:web
pnpm build:api
pnpm test:web
pnpm test:api
```

## Database migrations

```bash
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate
```

Use `pnpm --dir apps/api exec prisma migrate deploy` in controlled deployment environments.

## Architecture

Complianx uses a domain-oriented monorepo and a modular-monolith API. Important domains may use application/domain/infrastructure/presentation layers; simple CRUD modules should remain simple. Domain code must not depend on framework or vendor implementations. See [the architecture documentation](docs/architecture/system-context.md) and [decision records](docs/decisions/ADR-001-modular-monolith.md).

## Testing and deployment

App-specific tests can be run with `pnpm test:api` and `pnpm test:web`. Deployment paths changed from `/backend` and `/frontend` to `/apps/api` and `/apps/web`; see [deployment operations](docs/operations/deployment.md) and [DigitalOcean guidance](DEPLOYMENT_DIGITAL_OCEAN.md).
