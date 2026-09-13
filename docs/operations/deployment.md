# Deployment

The active deployment target is Hetzner managed through Coolify. Both applications use the repository root as their Docker build context so pnpm can resolve workspace packages. Their Dockerfiles remain at `apps/api/Dockerfile` and `apps/web/Dockerfile`.

Configure the API and web services from the same repository and set production secrets in Coolify. Keep the API database private to the deployment network and configure the web service with the public API URL. Preserve existing environment variables, API paths, webhook paths, and storage configuration.

## Database migrations

Run migrations as part of the API release before accepting traffic:

```bash
pnpm --filter api exec prisma migrate deploy
```

Use `prisma migrate dev` only for local development. Never reset or edit applied migrations in production. Take a database backup before releases that include schema changes and verify the migration status in the deployment logs.

`DEPLOYMENT_DIGITAL_OCEAN.md` is retained as historical reference; it is not the active deployment procedure.
