# Neuraldocx Aiki worker

This ESM service hosts Aiki's durable-workflow runtime. Its first workflow is report generation: it calls the API's private report-generation endpoint with a service token, so generation can survive retries and worker restarts.

The worker owns only Aiki run state. Set `AIKI_DATABASE_URL` to a dedicated PostgreSQL database; do not point it at the API's Prisma database. Apply Aiki migrations before first startup:

```bash
cd apps/worker
DATABASE_PROVIDER=pg DATABASE_URL="$AIKI_DATABASE_URL" pnpm aiki:migrate
```

Required runtime configuration:

```text
AIKI_DATABASE_URL=postgresql://...
AIKI_SERVICE_TOKEN=<shared random secret>
API_INTERNAL_URL=http://api:3000
```
