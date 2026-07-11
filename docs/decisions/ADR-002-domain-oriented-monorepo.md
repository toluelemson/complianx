# ADR-002: Domain-oriented monorepo

Status: Accepted

Applications live under `apps`, reusable framework-neutral code under `packages`, operational material under `infrastructure`, and architecture knowledge under `docs`. Business code is organized around capabilities instead of technical frameworks. pnpm workspaces and Turborepo coordinate tasks.
