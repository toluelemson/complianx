# Deployment

Both applications use the repository root as their Docker build context so pnpm can resolve workspace packages. Their Dockerfiles remain at `apps/api/Dockerfile` and `apps/web/Dockerfile`. Update deployment Dockerfile settings after this refactor. Preserve all existing environment variables, API route paths, webhook paths, database schema, and migration process. See the DigitalOcean guide at the repository root for concrete paths.
