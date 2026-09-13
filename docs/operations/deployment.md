# Deployment

The active deployment target is Hetzner managed through Coolify. Both applications use the repository root as their Docker build context so pnpm can resolve workspace packages. Their Dockerfiles remain at `apps/api/Dockerfile` and `apps/web/Dockerfile`.

Configure the API and web services from the same repository and set production secrets in Coolify. Keep the API database private to the deployment network and configure the web service with the public API URL. Preserve existing environment variables, API paths, webhook paths, and storage configuration.

## Production environment

The API validates production configuration before opening its HTTP port. Set real values in Coolify; never commit them or copy them into build arguments.

```text
NODE_ENV=production
DATABASE_URL=postgresql://<user>:<password>@<private-host>:5432/<database>
JWT_SECRET=<random value with at least 32 characters>

FRONTEND_URL=https://app.example.com
CORS_ORIGINS=https://app.example.com
STORAGE_ROOT=/data/neuraldocx

LLM_BASE_URL=https://<provider-api>
LLM_API_KEY=<provider secret>
LLM_MODEL=<reviewed production model>

SMTP_HOST=<smtp host>
SMTP_PORT=587
SMTP_USER=<smtp user>
SMTP_PASS=<smtp secret>
EMAIL_FROM=Neuraldocx <no-reply@example.com>

MONETIZATION_ENABLED=true
STRIPE_SECRET_KEY=<live secret key>
STRIPE_WEBHOOK_SECRET=<endpoint signing secret>
STRIPE_PRICE_PRO=<live price id>
STRIPE_PRICE_ENTERPRISE=<live price id>
```

Use a dedicated database role and password for the API. Keep PostgreSQL on the private deployment network and require encrypted connections when traffic can leave that network. Back up the database separately from application containers.

`STORAGE_ROOT` must be an absolute path backed by a persistent Coolify volume and writable only by the API service account. Package archives and evidence files are lost if this path uses ephemeral container storage. Back up the volume and test restoration with the matching database backup.

The application uses bearer JWTs and does not issue authentication cookies, so secure-cookie settings do not apply. Generate `JWT_SECRET` from a cryptographically secure source. Rotating it invalidates active sessions; schedule rotation and notify users accordingly.

`FRONTEND_URL` and every `CORS_ORIGINS` entry must be an exact HTTPS origin without a path. Origins are comma-separated when more than one frontend is required. The API no longer enables allow-all CORS when the list is empty and does not infer `www` aliases.

Production requires complete SMTP settings. This prevents verification, invitation, and reset links from falling back to application logs. Restrict access to API logs because operational metadata can still contain personal data.

If monetization is intentionally disabled, set `MONETIZATION_ENABLED=false`; only then may Stripe configuration be omitted. Otherwise all Stripe keys and live price identifiers are required. Configure the webhook endpoint at `/billing/webhook`, retain Stripe signature verification, and rotate its signing secret when the endpoint is recreated.

## HTTP limits and proxy configuration

The API applies a global per-IP request limit and a tighter limit of 10 requests per minute to authentication endpoints. Defaults are:

```text
API_BODY_LIMIT_BYTES=1048576
UPLOAD_MAX_BYTES=26214400
RATE_LIMIT_TTL_MS=60000
RATE_LIMIT_REQUESTS=300
TRUST_PROXY_HOPS=1
```

`API_BODY_LIMIT_BYTES` limits JSON, URL-encoded, and Stripe webhook bodies. `UPLOAD_MAX_BYTES` separately limits evidence multipart files. Keep the API private behind the Coolify proxy and set `TRUST_PROXY_HOPS` to the exact number of trusted proxy hops; an incorrect value can cause clients to share a rate-limit identity or allow spoofed forwarding headers.

The built-in limiter is per API process. For more than one API replica, configure a shared limiter at the Coolify ingress or replace the throttler storage with a shared store before scaling. Apply an ingress connection/request limit as an additional control and exclude only infrastructure health checks if necessary.

The LLM endpoint must use HTTPS, and production requires its URL, credential, and selected model. Scope the provider credential to the smallest available permissions and budget, and rotate it through Coolify. Do not send credentials or sensitive evidence contents to logs.

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
pnpm --filter api seed:eu-ai-act
```

Run the idempotent EU AI Act seed after migrations so onboarding has a published regulatory pack. The seed leaves an existing published or deprecated version immutable. Use `prisma migrate dev` only for local development. Never reset or edit applied migrations in production. Take a database backup before releases that include schema changes and verify the migration and seed status in the deployment logs.

`DEPLOYMENT_DIGITAL_OCEAN.md` is retained as historical reference; it is not the active deployment procedure.
