# Deployment

The active deployment target is Hetzner managed through Coolify. Both applications use the repository root as their Docker build context so pnpm can resolve workspace packages. Their Dockerfiles remain at `apps/api/Dockerfile` and `apps/web/Dockerfile`.

Configure the API and web services from the same repository and set production secrets in Coolify. Keep the API database private to the deployment network and configure the web service with the public API URL. Preserve existing environment variables, API paths, webhook paths, and storage configuration.

## Evidence malware scanning

Production API instances require a reachable ClamAV daemon. In Coolify, add a ClamAV service (for example, the maintained `clamav/clamav` container), attach it only to the API's private network, persist its virus-definition directory, and do not publish port 3310 to the internet. Configure the API with:

```text
NODE_ENV=production
FILE_SCANNER_PROVIDER=clamav
CLAMAV_HOST=<Coolify private service hostname>
CLAMAV_PORT=3310
CLAMAV_TIMEOUT_MS=10000
```

Allow the ClamAV health check and initial signature download to complete before starting the API. The API fails during startup if production selects `noop`, omits the provider, or omits the ClamAV host. If ClamAV is unreachable, times out, or returns an invalid response during an upload, the API fails the upload with HTTP 503 and does not store the file. A positive malware result rejects the upload with HTTP 400.

Set `FILE_SCANNER_PROVIDER=noop` only for development and test environments. The development scanner still rejects obvious executable headers, but it is not malware protection.

## Database migrations

Run migrations as part of the API release before accepting traffic:

```bash
pnpm --filter api exec prisma migrate deploy
```

Use `prisma migrate dev` only for local development. Never reset or edit applied migrations in production. Take a database backup before releases that include schema changes and verify the migration status in the deployment logs.

`DEPLOYMENT_DIGITAL_OCEAN.md` is retained as historical reference; it is not the active deployment procedure.
